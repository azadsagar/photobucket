//import logo from './logo.svg';
import './App.css';
import { Component } from 'react';
import theme from "./theme"
import { ThemeProvider } from '@material-ui/styles';
import PhotoGallery from "./Components/PhotoGallery/PhotoGallery";
import {
  Dialog, 
  DialogActions,
  DialogTitle,
  AppBar,
  Toolbar,
  Typography,
  withStyles,
  Button,
  IconButton,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@material-ui/core';
import {
  AccountCircle,
  CloudUploadOutlined,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  ExitToAppOutlined
} from "@material-ui/icons";



import MenuIcon from "@material-ui/icons/Menu";
import useStyles from './useStyles';
import Amplify, {Auth} from 'aws-amplify';
import awsconfig from './aws-config';
import LoginUI from './Components/LoginUI/LoginUI';
import PhotoUpload from './Components/PhotoUpload/PhotoUpload';
import clsx from 'clsx';

/* const useStyles = (theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}); */


const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);


const [
  localRedirectSignIn,
  productionRedirectSignIn,
] = awsconfig.Auth.oauth.redirectSignIn.split(",");

//awsconfig.oauth.redirectSignIn.split(",")

const [
  localRedirectSignOut,
  productionRedirectSignOut,
] = awsconfig.Auth.oauth.redirectSignOut.split(",");

let updatedAwsConfig = {...awsconfig};

if(isLocalhost){
  updatedAwsConfig.Auth.cookieStorage.domain = "localhost";
  updatedAwsConfig.Auth.cookieStorage.secure=false;
  updatedAwsConfig.Auth.oauth.redirectSignIn = localRedirectSignIn;
  updatedAwsConfig.Auth.oauth.redirectSignOut = localRedirectSignOut;
}
else {
  updatedAwsConfig.Auth.cookieStorage.domain = process.env.REACT_APP_DOMAIN;
  updatedAwsConfig.Auth.cookieStorage.secure=true;
  updatedAwsConfig.Auth.oauth.redirectSignIn = productionRedirectSignIn;
  updatedAwsConfig.Auth.oauth.redirectSignOut = productionRedirectSignOut;
}


/* const updatedAwsConfig = {
  ...awsconfig,
  oauth: {
    ...awsconfig.oauth,
    redirectSignIn: isLocalhost ? localRedirectSignIn : productionRedirectSignIn,
    redirectSignOut: isLocalhost ? localRedirectSignOut : productionRedirectSignOut,
  }
}; */

//Amplify.configure(awsconfig);
Amplify.configure(updatedAwsConfig);


class App extends Component {

  state ={
    user : null,
    email : null,
    openUpload : false,
    anchorEl : null,
    open: false,
    openDrawer : false
  };

  

  constructor(){
    super();

    Auth.currentAuthenticatedUser()
      .then(user=>{
        this.setState({ user });

        return Auth.currentSession();
      }).then(data=>{
        let idToken=data.getIdToken();
        let email = idToken.payload.email;
        this.setState({
          email: email
        });

      })
      .catch(error=>{
        console.log(error,"Not signed in")
      });
  }

  openUploadHanlder = () => {
    this.setState({
      openUpload: true
    });
  };

  closeUploadHanlder = () => {
    this.setState({
      openUpload: false
    });
  };

  handleMenu = (event) => {
    //setAnchorEl(event.currentTarget);
    this.setState({
      anchorEl : event.currentTarget
    });
  };

  handleClose = () => {
    this.setState({
      anchorEl : null
    });
  };

  handleDrawerOpen = () => {
    this.setState({
      openDrawer: true
    });
  };

  handleDrawerClose = () => {
    this.setState({
      openDrawer: false
    });
  };

  signOut = async () => {
    try {
      await Auth.signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  }

  render(){
    const classes = this.props;
    return (
      <div className={classes.root}>
        {
          this.state.user === null ? <LoginUI /> :
        
            <ThemeProvider theme={theme}>
              
              <AppBar 
                position="fixed"
                className={
                  clsx(classes.appBar,{
                    [classes.appBarShift]: this.state.openDrawer,
                  })
                }
              >
                <Toolbar>
                  <IconButton 
                    onClick={this.handleDrawerOpen}
                    edge="start" 
                    className={clsx(classes.menuButton, this.state.openDrawer && classes.hide)}
                    color="inherit" 
                    aria-label="open drawer"
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6"  noWrap>
                    PHOTO BUCKET
                  </Typography>
                </Toolbar>

              </AppBar>

              <Drawer
                className={classes.drawer}
                variant="persistent"
                anchor="left"
                open={this.state.openDrawer}
                classes={
                  {
                    paper: classes.drawerpaper
                  }
                }
              >
                <div className={classes.drawerHeader}>
                  <IconButton onClick={this.handleDrawerClose}>
                    { theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                  </IconButton>
                </div>
                <Divider />
                <List>
                  <ListItem button key="username">
                    <ListItemIcon>
                      <AccountCircle />
                    </ListItemIcon>
                    <ListItemText primary={this.state.email} />
                  </ListItem>
                  <ListItem button key="Add Photos" onClick={this.openUploadHanlder}>
                    <ListItemIcon>
                      <CloudUploadOutlined />
                    </ListItemIcon>
                    <ListItemText primary="Add Photos" />
                  </ListItem>
                  <ListItem button key="Logout" onClick={this.signOut}>
                    <ListItemIcon>
                      <ExitToAppOutlined />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </ListItem>
                </List>

              </Drawer>

              <main 
                className={clsx(classes.content, {
                  [classes.contentShift]: this.state.openDrawer
                })}
              >
              <div className={classes.drawerHeader} />

                <PhotoGallery />

              </main>

              <Dialog open={this.state.openUpload} onClose={this.closeUploadHanlder} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Add Photos and Upload</DialogTitle>
                <PhotoUpload />
                <DialogActions>
                  <Button onClick={this.closeUploadHanlder} color="primary">
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              


            </ThemeProvider>
      }
      </div>
    );
  }
}

export default withStyles(useStyles)(App);
