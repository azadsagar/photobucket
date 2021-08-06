const sharp = require("sharp");
const path=require("path")
const {S3,DynamoDB}=require("aws-sdk");


const logger = async data => {

    if(typeof(data) === 'object'){
        console.log(new Date(),JSON.stringify(data,null,2));
        return;
    }

    console.log(new Date(),data);
}

exports.handler = async event => {
    
    try {
    
        const s3 = new S3();

        let key = event.Records[0].s3.object.key.replace("%3A",":");
    
        let data = await s3.getObject({
            Bucket: event.Records[0].s3.bucket.name,
            Key: key
        }).promise();

        let image = sharp(data.Body);
        const metadata = await image.metadata();

        //logger("1. came till here");

        const date = new Date();
        let dt = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`;
        let mo = date.getMonth() + 1;
        mo = mo > 9 ? mo : `0${mo}`;
        let year = date.getFullYear();

        //let basename = path.basename(key);
        let basename = `${event.Records[0].s3.object.eTag}_${path.basename(key)}`;
        let username = key.split("/")[0];

        const webpextension = basename.split(".").slice(0,-1).join(".");

        //console.log(`${username}/thumbnails/${year}/${mo}/${dt}/${webpextension}.webp`);

        //process.exit(0);

        //console.log(JSON.stringify(process.memoryUsage(),null,2));        

        await Promise.all([
            image.resize(metadata.width > 400 ? 400 : metadata.width).webp().toBuffer().then(outputBuffer => {
                //console.log("inside resize");

                return s3.putObject({
                    Key: `${username}/thumbnails/${year}/${mo}/${dt}/${webpextension}.webp`,
                    Bucket : process.env.OUTPUT_BUCKET,
                    Body : outputBuffer,
                    ServerSideEncryption: "AES256",
                    StorageClass: "ONEZONE_IA"
                }).promise()
            }),

             image.resize(metadata.width > 1080 ? 1080 : metadata.width).webp().toBuffer().then(outputBuffer => {
                //console.log("inside resize");
                return s3.putObject({
                    Key: `${username}/web/${year}/${mo}/${dt}/${webpextension}.webp`,
                    Bucket : process.env.OUTPUT_BUCKET,
                    Body : outputBuffer,
                    ServerSideEncryption: "AES256",
                    StorageClass: "ONEZONE_IA"
                }).promise()
            }),

            s3.putObject({
                Key: `${username}/photos/${year}/${mo}/${dt}/${basename}`,
                Bucket : process.env.OUTPUT_BUCKET,
                Body : data.Body,
                ServerSideEncryption: "AES256",
                StorageClass: "ONEZONE_IA"
            }).promise() 
        ]);

        image = null;
        data = null;

        //console.log(JSON.stringify(process.memoryUsage(),null,2));

        //console.log("came till here");

        for (key of ["exif","icc","iptc","xmp","tifftagPhotoshop","levels"]){
            delete metadata[key];
        }

        const documentCleint = new DynamoDB.DocumentClient({
            region: "ap-south-1"
        });

        await documentCleint.put({
            TableName: process.env.METADATA_DB,
            Item: {
                username : username,                //partition key
                timestamp : new Date().getTime(),   //sort key
                thumb : `thumbnails/${year}/${mo}/${dt}/${webpextension}.webp`,
                web: `web/${year}/${mo}/${dt}/${webpextension}.webp`,
                link: `photos/${year}/${mo}/${dt}/${basename}`,
                meta : metadata
            }
        }).promise();

        await s3.deleteObject({
            Bucket: event.Records[0].s3.bucket.name,
            Key: key
        }).promise();

        //console.log(JSON.stringify(process.memoryUsage(),null,2));

        
    } catch (error) {
        console.log("caught in exception");
        logger(error);
        
        return false;
    }

    return true;

}