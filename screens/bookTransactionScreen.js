import * as React from 'react';
import { Text,View, TouchableOpacity, StyleSheet, TextInput, Image, KeyboardAvoidingView, ToastAndroid,Alert} from 'react-native';
import * as Permissions from 'expo-permissions';
import {BarCodeScanner, BarcodeScanner} from 'expo-barcode-scanner';
import * as firebase from 'firebase';
import db from '../config';

export default class TransactionScreen extends React.Component{
    constructor(){
        super();
        this.state={
            scanned:false,
            hasCameraPermissions:null,
            buttonState:'normal',
            scannedBookId:'',
            scannedStudentId:'',
            transactionMessage:''
        }
    }

    getCameraPermissions=async(id) => {
        const {status}=await Permissions.askAsync(Permissions.CAMERA);
        this.setState({
            hasCameraPermissions:status === 'granted',
            buttonState:id,
            scanned:false
        })
    }

    handleBarCodeScanned= async({type,data})=>{
        const {buttonState}=this.state

        if(buttonState==='bookId'){
            this.setState({
                scanned:true,
                scannedBookId:data,
                buttonState:'normal'
            })
        }

        else if(buttonState==='studentId'){
            this.setState({
                scanned:true,
                scannedStudentId:data,
                buttonState:'normal'
            })
        }
    }

    initiateBookIssue=async()=>{
        db.collection('transaction').add({
            'studentId':this.state.scannedStudentId,
            'bookId':this.state.scannedBookId,
            'data':firebase.firestore.Timestamp.now().toDate(),
            'transactionType':"Issue"
        })

        db.collection('books').doc(this.state.scannedBookId).update({
            'bookAvailability':false
        })

        db.collection('students').doc(this.state.scannedStudentId).update({
            'numberOfBooksIssued':firebase.firestore.FieldValue.increment(1)
        })

        this.setState({
            scannedBookId:'',
            scannedStudentId:''
        })
    }


    initiateBookReturn=async()=>{
        db.collection('transaction').add({
            'studentId':this.state.scannedStudentId,
            'bookId':this.state.scannedBookId,
            'data':firebase.firestore.Timestamp.now().toDate(),
            'transactionType':"Return"
        })

        db.collection('books').doc(this.state.scannedBookId).update({
            'bookAvailability':true
        })

        db.collection('students').doc(this.state.scannedStudentId).update({
            'numberOfBooksIssued':firebase.firestore.FieldValue.increment(-1)
        })

        this.setState({
            scannedBookId:'',
            scannedStudentId:''
        })
    }

    checkBookEligibility=async()=>{
        const bookRef= await db
        .collection('books')
        .where('bookId','==',this.state.scannedBookId)
        .get();

        var transactionType='';

        if(bookRef.docs.length===0){
            transactionType=false
        }

        else{
            bookRef.docs.map(doc=>{
                var book=doc.data();

                if(book.bookAvailability){
                    transactionType='Issue';
                }

                else{
                    transactionType='Return';
                }
            })
        }

        return transactionType;
    }

    checkStudentEligibilityForBookIssue=async()=>{
        const studentRef=await db
        .collection('students')
        .where('studentId','==',this.state.scannedStudentId)
        .get();

        var isStudentEligible='';

        if(studentRef.docs.length===0){
            isStudentEligible=false;
            alert('Student Id does not exist in the database');

            this.setState({
                scannedBookId:'',
                scannedStudentId:''
            })
        }

        else{
            studentRef.docs.map(doc=>{
                var student=doc.data();

                if(student.numberOfBooksIssued < 2){
                    isStudentEligible=true;
                }

                else{
                    isStudentEligible=false;
                    alert("The student already has 2 books");

                    this.setState({
                        scannedBookId:'',
                        scannedStudentId:''
                    })
                }
            })
        }

        return isStudentEligible;
    }

    checkStudentEligibilityForBookReturn=async()=>{
        const transactionRef=await db
        .collection('transaction')
        .where('bookId','==',this.state.scannedBookId)
        .limit(1)
        .get();

        var isStudentEligible=''

        transactionRef.docs.map(doc=>{
            var lastBookTransaction=doc.data();

            if(lastBookTransaction.studentId===this.state.scannedStudentId){
                isStudentEligible=true;
            }

            else{
                isStudentEligible=false;
                alert("This book wasn't issued by the student")

                this.setState({
                    scannedBookId:'',
                    scannedStudentId:''
                })
            }
        })

        return isStudentEligible;
    }

    handleTransaction=async()=>{
        var transactionType= await this.checkBookEligibility();

        if(!transactionType){
            alert("This book does not exist in the database");
            this.setState({
                scannedBookId:'',
                scannedStudentId:''
            })
        }

        else if(transactionType==='Issue'){
            var isStudentEligible=await this.checkStudentEligibilityForBookIssue();

            if(isStudentEligible){
                this.initiateBookIssue();
                alert("Book is issued to the student");
            }
        }

        else{
            var isStudentEligible=await this.checkStudentEligibilityForBookReturn();

            if(isStudentEligible){
                this.initiateBookReturn();
                alert("Book is returned to the library");
            }
        }
    }

    render(){
        const hasCameraPermissions=this.state.hasCameraPermissions;
        const scanned=this.state.scanned;
        const buttonState=this.state.buttonState;

        if(buttonState !== 'normal' && hasCameraPermissions){
            return(
                <BarCodeScanner
                onBarCodeScanned={
                    scanned
                    ?undefined
                    :this.handleBarCodeScanned
                }

                style={StyleSheet.absoluteFillObject}
                />
            )
        }

        else if(buttonState==='normal'){
        
        return(
            <KeyboardAvoidingView
            style={styles.container}
            behavior='padding' enabled>
            <View
            style={styles.container}>

                <View>
                    <Image
                    source={require('../assets/booklogo.jpg')}
                    style={{width:200,height:200}} />

                    <Text style={{textAlign:'center',fontSize:30}}> Wily </Text>
                </View>

                <View style={styles.inputView}>
                    <TextInput 
                    style={styles.inputBox}
                    placeholder='bookId'
                    onChangeText={text=>
                    this.setState({scannedBookId:text})}

                    value={"",this.state.scannedBookId}
                    />

                    <TouchableOpacity 
                    style={styles.scanButton} 
                    onPress={()=>{this.getCameraPermissions('bookId')}}
                    >
                        <Text style={styles.buttonText}> Scan </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputView}>
                    <TextInput 
                    style={styles.inputBox}
                    placeholder='studentId'
                    onChangeText={text=>
                    this.setState({scannedStudentId:text})}

                    value={"",this.state.scannedStudentId}
                    />

                    <TouchableOpacity 
                    style={styles.scanButton}
                    onPress={()=>{this.getCameraPermissions('studentId')}}
                    >
                        <Text style={styles.buttonText}> Scan </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                style={styles.submitButton}
                onPress={async()=>{
                    var transactionMessage=await this.handleTransaction();
                    this.setState({
                        scannedBookId:'',
                        scannedStudentId:''
                    })
                }}>

                    <Text style={styles.submitButtonText}> Submit </Text>
                </TouchableOpacity>
            </View>
            </KeyboardAvoidingView>
        )
    }
    }
}

const styles=StyleSheet.create({

    container:{ 
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center', 
    },

    scanButton:{
        backgroundColor:'#66BB6A', 
        width:50,
        borderWidth:1.5,
        borderLeftWidth:0
    }, 
        
    displayText:{ 
     fontSize:15, 
     textDecorationLine:'underline', 
    }, 

    buttonText:{ 
        fontSize:15,
        textAlign:'center',
        marginTop:10,
    },

    inputView:{
        flexDirection:'row',
        margin:20,
    },

    inputBox:{
        width:200,
        height:40,
        borderWidth:1.5,
        borderRightWidth:0,
        fontSize:20,
    },

    submitButton:{
        backgroundColor:'#FBC02D',
        width:100,
        height:50,
    },

    submitButtonText:{
        padding:10,
        textAlign:'center',
        fontSize:20,
        fontWeight:'bold',
        color:'white'
    }
})