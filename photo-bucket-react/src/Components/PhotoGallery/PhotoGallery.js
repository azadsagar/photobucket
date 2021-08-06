//import { withStyles } from "@material-ui/core/styles";
import { Component } from "react";
//import useStyles from "../../useStyles";
//import Gallery from "react-grid-gallery";
import {Storage} from 'aws-amplify';
import axios from "axios";
import "./styles.css";
import InfiniteScroll from "react-infinite-scroller";
import {Auth} from "aws-amplify";
import {LinearProgress} from "@material-ui/core"

const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

Storage.configure({
    customPrefix: {
        private: ''
    },
    level : 'private'
});


const LightBox = (props) =>{
    return (
    <div style={
        {
            zIndex: "2000",
            position:"fixed",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            top:"0px",
            width: "100%",
            height: "100%"
        }

    }>
        <img alt="PhotoBucket" style={{cursor: "pointer"}} src={props.src} onClick={props.callback} />
    </div>);
};

class PhotoGallery extends Component {

    state = {
        nextmarker : null,
        photoList : null,
        openLightBox : false,
        lightBoxImg : null,
        hasMore : true,
        fetching: false,
        images : [
            
        ]
    };

    delayWait =  delay => {
        return new Promise(resolve=>{
            setTimeout(()=>{
                resolve(true);
            },delay)
        });
    };

    fetchPhotos = async () => {
        if(this.state.fetching){
            return;
        }

        this.setState({
            fetching: true
        });

        //let url = "http://localhost:4000/list/photos?maxresults=10";
        let url = isLocalhost ? "http://localhost:4000/list/photos?maxresults=10" : "/list/photos?maxresults=10";
        const urlCreater = window.URL || window.webkitURL;

        let photoGrid = [];

        if(this.state.nextmarker !== null){
            url=`${url}&nextmarker=${this.state.nextmarker}`
        }

        try {
            
            let authsession = await Auth.currentSession();
            let jwtToken = authsession.getIdToken().jwtToken;

            let photoList = await axios.get(url,{
                headers : {
                    Authorization: jwtToken
                },
                responseType : "json"
            });

            /* console.log(typeof(photoList));
            console.dir(photoList); */

            for(let item of photoList.data.data){
                let thumb = await Storage.get(item.thumb,{download: true});
                photoGrid.push({
                    thumbnail : urlCreater.createObjectURL(thumb.Body),
                    src: item.web,
                    download : item.link,
                    key : item.timestamp
                });
            }

            //let updateList = [...this.state.photoList,...photoGrid];
            let updateList= null;
            
            if(this.state.photoList){
                updateList=[...this.state.photoList,...photoGrid]
            }
            else{
                updateList=photoGrid;
            }

            console.dir(updateList);

            this.setState({
                photoList : updateList,
                nextmarker : "nextmarker" in photoList.data ? photoList.data.nextmarker : null
            });

            if("nextmarker" in photoList.data){
                this.setState({
                    hasMore: true
                });
            }

            this.setState({
                fetching: false
            });

        } catch (error) {
            console.error(error);
            this.setState({
                hasMore: false,
                fetching: false
            });
        }
        
    }

    thumbClick = (index) => {
        const urlCreater = window.URL || window.webkitURL;

        try {

            this.setState({
                openLightBox: true
            });

            Storage.get(this.state.photoList[index].src,{download: true}).then(data=>{
                let image = urlCreater.createObjectURL(data.Body);

                this.setState({
                    lightBoxImg : image
                });
            });
            
        } catch (error) {
            console.log(error);
            this.setState({
                openLightBox: false,
                lightBoxImg : null
            });
        }

    };

    closeLightBox = (event) => {
        //console.log(event);
        this.setState({
            openLightBox: false,
            lightBoxImg: null
        });
    };

    render(){
        let gallery = this.state.photoList !== null  ? this.state.photoList.map((item,index)=>{
            //let key = item.thumbnail.split("/").reverse()[0];
            return (
                <div className="image-item" key={index} >
                    <img alt="PhotoBucket" style={{cursor:"pointer"}} src={item.thumbnail} onClick={this.thumbClick.bind(this,index)} />
                </div>
            );
        }) : <p>No Memories Here ...</p>;

        return (
            <InfiniteScroll
                loadMore={this.fetchPhotos}
                hasMore={this.state.hasMore}
                loader={<div style={{padding:"70px"}} key={0}><LinearProgress color="secondary" /></div>}
            >
                <div style={{ marginTop: "80px", position: "relative", textAlign: "center" }}>
                    <div className="image-grid" style={{ marginTop: "30px" }}>
                        {gallery}
                    </div>
                    {this.state.openLightBox ?
                        <LightBox src={this.state.lightBoxImg} callback={this.closeLightBox} />
                        : null}

                </div>
            </InfiniteScroll>
            
        );
    }
}

export default PhotoGallery;