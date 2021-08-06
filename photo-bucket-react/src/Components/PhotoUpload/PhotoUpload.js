import { Component } from "react";
import {
    DialogContentText,
    DialogContent,
    Fab
} from "@material-ui/core";

import {
  Add as AddIcon,
  Check as CheckIcon,
  CancelOutlined
} from "@material-ui/icons";
import {LinearProgress,ListItem,ListItemIcon,ListItemText,CircularProgress} from "@material-ui/core"

import axios from "axios";
import {Auth} from "aws-amplify";

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

class PhotoUpload extends Component {

  state = {
    showBusy : false,
    uploadList : []
  };

  dummyInput=null;
  parallelUpload=0;

  getPresignedURLS = async payload => {

    let authsession = await Auth.currentSession();
    let jwtToken = authsession.getIdToken().jwtToken;

    return axios({
      method: "post",
      //url: "http://localhost:4000/prep/photoupload",
      url: isLocalhost ?  "http://localhost:4000/prep/photoupload" : "/prep/photoupload" ,
      data: {
        photoList: JSON.stringify(payload)
      },
      headers: {
        Authorization: jwtToken
      }
    });

  };

  dummyWait = () => {

    return new Promise(resolve=>{
      setTimeout(()=>{
        resolve(true)
      },20);
    });

  };

  uploadPhoto = async (payload,index) => {
    let copyUploadList=[...this.state.uploadList];

    try {

      await axios({
        method: "post",
        url : process.env.REACT_APP_UPLOAD_BUCKET,
        data: payload,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      //let copyUploadList=[...this.state.uploadList];

      copyUploadList[index].completed = true;
      
    } catch (error) {
      console.log(error);
      copyUploadList[index].failed=true;
    }

    this.setState({
      uploadList: [...copyUploadList]
    });

    this.parallelUpload-=1;

  };

  photoSelectedHandler = async event => {
    //console.log(event.target.files);

    /* for(let photo of event.target.files){
      console.log(photo.name,photo.size);
    } */

    //console.log(event.target.files[0]);

    let photoList = [];
    let uploadList = [];

    for(let photo of event.target.files){
      photoList.push(photo.name);
      uploadList.push({
        name : photo.name,
        failed : false,
        completed: false
      });
    }

    if(photoList.length === 0){
      return;
    }

    try {

      this.setState({
        showBusy: true,
        uploadList : [...uploadList]
      });

      uploadList=null;


      //let authsession = await Auth.currentSession();
      //let jwtToken = authsession.getIdToken().jwtToken;


      let tempList = photoList.slice(0,10);

      let itteration = 0;

      do{

        try {
          let presignedResponse = await this.getPresignedURLS(tempList)

          let data = presignedResponse.data.data;

          let itemIndex=0;

          for(let d of data){
            let formData = new FormData();
            let keys = Object.keys(d.fields);

            for(let k of keys){
              formData.append(k,d.fields[k]);
            }

            formData.append("file",event.target.files[itteration+itemIndex],"file");

            this.uploadPhoto(formData,itteration+itemIndex);
            this.parallelUpload+=1;

            while(this.parallelUpload>5){
              await this.dummyWait();
            }

            itemIndex++;

          }

        } catch (error) {

          let copyUploadList=[...this.state.uploadList];

          for(let i=itteration;i<tempList.length;i++){
            copyUploadList[i].failed=true;
          }

          this.setState({
            uploadList: [...copyUploadList]
          });
          
          //itteration+=10;
          //tempList=photoList.slice(itteration,itteration+10);
          //continue;
        }

        itteration+=10;
        tempList=photoList.slice(itteration,itteration+10);

      }while(tempList.length>0);


      while(this.parallelUpload !== 0){
        await this.dummyWait();
      }


      this.setState({
        showBusy: false
      });

      //console.log(response);

    } catch (error) {
      console.log(error) ;
    }
  };
  
  handleDummy = input => {
    console.log(input)
  }

  handleForm = form => {
    //const formData = new FormData(form);

    //console.dir(formData);
  }

  render() {
    return (
      <DialogContent>
        <DialogContentText>
          {this.state.showBusy ? "Uploading in Progress..." : null }
          <Fab variant="extended" color="primary" size="medium" aria-label="Upload Photos" style={{visibility:this.state.showBusy ? "hidden" : "visible"}} >

              { this.state.showBusy ? null : <AddIcon variant="outline" /> }
              <input type="file" style={{visibility:this.state.showBusy ? "hidden" : "visible"}} onChange={this.photoSelectedHandler} accept=".jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff|image/*" multiple />
            
          </Fab>
        </DialogContentText>

        {this.state.showBusy ? <LinearProgress color="secondary" /> : null}

        <div>
          {
            this.state.uploadList.length > 0 ? 
            this.state.uploadList.map((data,index)=>{
              return (
                <ListItem>
                  <ListItemIcon>
                    {data.failed ? <CancelOutlined color="secondary" /> : data.completed ? <CheckIcon color="success" /> : <CircularProgress color="secondary" /> }
                  </ListItemIcon>
                  <ListItemText primary={data.name} />
                </ListItem>
              );
            }) : null
          }
        </div>
        
      </DialogContent>
    );
  }
}

export default PhotoUpload;