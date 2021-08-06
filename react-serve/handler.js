//'use strict';
const serverless = require("serverless-http");
const express = require("express");
const bodyParser = require('body-parser');
const path = require('path');
const {DocumentClient } = require("aws-sdk").DynamoDB;
const {CognitoIdentity,S3} = require("aws-sdk");
//require("dotenv").config();

//const cors = require("cors");
//const { resolve } = require("path");

const app = express();

//app.use(cors());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.set('trust proxy', true);
app.disable('etag');
//const fs = require("fs");

const logger = async data => {
  if(typeof(data) === 'object'){
    console.log(new Date(),JSON.stringify(data,null,2));
    return;
  }

  console.log(new Date(), data);

}

app.post("/prep/photoupload",async (req,res)=>{
  try {
    
    let identityParams = {
      IdentityPoolId : process.env.POOLID,
      Logins : {}
    };

    identityParams.Logins[`${process.env.COGNITOIDP}`] = req.headers.authorization;

    const ci = new CognitoIdentity({region : process.env.AWSREGION});

    let idpResponse = await ci.getId(identityParams).promise();

    const prefix = idpResponse.IdentityId;

    const photoList = JSON.parse(req.body.photoList);

    if(photoList.length>10){
      return res.status(403).json({
        status: 403,
        success: false,
        msg: "This api allows you to upload max 10 photos at a time"
      });
    }

    let s3Params = {
      Bucket: process.env.UPLOAD_BUCKET,
      Conditions : [
        ["content-length-range",1,31457280]
      ],
      Fields : {
        key: null
      },
      Expires: 300 * photoList.length
    };

    let prep = photoList.map(p=> `${prefix}/${Math.random().toString(36).substring(2)}/${p}`);

    let responseData = [];

    const s3 = new S3({
      region: process.env.AWSREGION
    });

    for(let p of prep){

      s3Params.Fields.key=p;

      responseData.push(
        s3.createPresignedPost(s3Params)
      );

    }


    //logger(responseData);

    return res.status(200).json({
      status: 200,
      success: true,
      data : responseData
    });

  } catch (error) {
    console.log(error);
    
    return res.status(500).json({
      success : false,
      status : 500,
      msg : "something went wrong while fetching data...!"
    });
  }
});

app.get("/list/photos",async (req,res)=>{

  //console.log(req.headers.authorization);

  //return res.status(200).json({"hello" : "world"});
  
  const documentClient = new DocumentClient({
    region : process.env.AWSREGION
  });

  let identityParams = {
    IdentityPoolId : process.env.POOLID,
    Logins : {}
  };

  identityParams.Logins[`${process.env.COGNITOIDP}`] = req.headers.authorization;

  const ci = new CognitoIdentity({region : process.env.AWSREGION});

  try {
    let idpResponse = await ci.getId(identityParams).promise();

    let hashKey = idpResponse.IdentityId;

    let params = {
      TableName : process.env.METADATA_DB,
      KeyConditionExpression: '#username = :hkey and #ts <= :rkey',
      ExpressionAttributeValues: {
        ':hkey' : hashKey,
        ':rkey' : new Date().getTime()
      },
      ExpressionAttributeNames: { '#username': 'username', '#ts': 'timestamp' },
      ScanIndexForward: false,
      Limit: 20
    };

    if("nextmarker" in req.query){
      console.log(req.query.nextmarker);
      params["ExclusiveStartKey"] = {
        username : hashKey,
        timestamp : parseInt(req.query.nextmarker)
      };
    }

    

    if("maxresults" in req.query){
      console.log(req.query.maxresults);
      params.Limit= parseInt(req.query.maxresults) > 20 ? 20 : parseInt(req.query.maxresults);
    
    }

    console.log(JSON.stringify(params,null,2));

    let data = await documentClient.query(params).promise();

    let response = {
      status : 200,
      success: true,
      data : data.Items,
      count : data.Count
    };

    //console.log(JSON.stringify(data,null,2));

    if("LastEvaluatedKey" in data){
      response["nextmarker"] = data.LastEvaluatedKey.timestamp;
    }

    return res.status(200).json(response);

  } catch (error) {
    logger(error);
    return res.status(500).json({
      success : false,
      status : 500,
      msg : "something went wrong while fetching data...!"
    });

  }
});


app.get("/",(req,res)=> {
  res.sendFile(path.join(__dirname + "/index.html"));
});

module.exports.uihome = serverless(app);

/* app.listen(4000,()=>{
  console.log("server started listening on port");
}); */