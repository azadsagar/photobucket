import { Component } from "react";
import {withStyles} from "@material-ui/core/styles";
import { Avatar, Box, Button, Container, CssBaseline, TextField, Typography, Link } from "@material-ui/core";
import { PhotoCameraOutlined } from "@material-ui/icons";
import Amplify, { Auth, Hub, Storage } from 'aws-amplify';
import awsconfig from "../../aws-config";
import useStyles from "../../useStyles";
import logo from "./googlelogo.svg";

Amplify.configure(awsconfig);
Storage.configure({
    customPrefix: {
        private: ''
    },
    level : 'private'
});



class LoginUI extends Component {

    state = {
        username : null,
        password: null,

        user: null,
        customeState: null
    };

    listMyFiles = async () => {
        console.log(Storage.configure());

        Storage.list('') // for listing ALL files without prefix, pass '' instead
            .then(result => console.log(result))
            .catch(err => console.log(err));
        
        console.log(await Auth.currentUserCredentials());
    };


    componentDidMount(){
        Hub.listen("auth", ({ payload: { event, data } }) => {
            switch (event) {
                case "signIn":
                    this.setState({ user: data });
                    break;
                case "signOut":
                    this.setState({ user: null });
                    break;
                case "customOAuthState":
                    this.setState({ customState: data });
                    break;
                default:
                    console.log(event);
            }
        });

        Auth.currentAuthenticatedUser()
            .then(user => {
                this.setState({ user });

                //this.listMyFiles();
                
            }).catch((error) => console.log(error,"Not signed in"));

        Auth.currentSession()
            .then(data => {
                let idToken = data.getIdToken();
                console.dir(idToken);
                let email = idToken.payload.email;
                console.log(email);

                //this.listMyFiles();

            })
            .catch(error => console.log("Error Executing Current Session",error));

    }

    userNameHandler = event => {
        this.setState({
            username: event.target.value
        });
    };

    passwordHandler = event => {
        this.setState({
            password: event.target.value
        });
    };

    formsubmit = (event) =>  {
        console.log("I was submited");
        event.preventDefault();
    };
    

    render (){
        const {classes} = this.props;

        return (
            <Container component="main" maxWidth="xs">
                <CssBaseline/>
                <div className={classes.paper}>
                    <Avatar className={classes.avatar}>
                        <PhotoCameraOutlined />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign in
                    </Typography>
                    <form className={classes.form} noValidate onSubmit={this.formsubmit} method="post">
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            onChange={this.userNameHandler}
                        />
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            onChange={this.passwordHandler}
                        />

                        <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        className={classes.submit}
                        >
                            Submit
                        </Button>

                        <Button startIcon={<img alt="Sigin in With Google" src={logo} />} fullWidth variant="outlined" color="primary" onClick={() => Auth.federatedSignIn({provider: 'Google'})}>
                            Sign in with Google
                        </Button>
                        
                    </form>
                </div>
                <Box mt={8}>
                    <Typography variant="body2" color="textSecondary" align="center">
                        {'Copyright © '}
                        <Link color="inherit" href={`"http://${process.env.REACT_APP_DOMAIN}"`}>
                            Photo Bucket
                        </Link>{' '}
                        {new Date().getFullYear()}
                        {'.'}
                    </Typography>
                </Box>
            </Container>
        );
    }
}

export default withStyles(useStyles)(LoginUI);