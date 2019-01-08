import { Injectable  } from '@angular/core';
import {AlertController, Events, LoadingController} from 'ionic-angular';
import { HttpClient , HttpHeaders} from "@angular/common/http";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject} from "rxjs";
import {LeadPage} from "../../pages/lead/lead";
import {take} from "rxjs/operator/take";
// import { LeadPage} from "../../pages/lead/lead";
import {DomSanitizer} from '@angular/platform-browser';

import {HTTP} from '@ionic-native/http'


@Injectable()


export class ChatServiceProvider {

  public chatClientStarted = false;

  loading: boolean = false;

  public msgList: ChatMessage[] = [];

  private msgListSource = new BehaviorSubject<any>(this.msgList);

  msgListActualizada = this.msgListSource.asObservable();


  private loadingMessagesSource = new BehaviorSubject<any>(this.loading);

  loadingMessagesActualizado = this.loadingMessagesSource.asObservable();

  indicadorLongitudConversacion = null;

  private longitudConversacionSource = new BehaviorSubject<any>(this.indicadorLongitudConversacion);

  longitudConversacion = this.longitudConversacionSource.asObservable();


  GENERAL_CHANNEL_UNIQUE_NAME = 'general';
  GENERAL_CHANNEL_NAME = 'General Channel';
  MESSAGES_HISTORY_LIMIT = 50;

  public tc: any;

  public accessManager: any;



  public loadingMessages;

  constructor(private http: HttpClient,
              private http2: HTTP,
              private events: Events,
              public loadingCtrl: LoadingController,
              public alertCtrl: AlertController, public sanitizer: DomSanitizer) {

    this.tc = {
      messagingClient: null,
      channelArray: [],
      generalChannel: null,
      currentChannel: null,
      messageList: [],
      username: null
    };


  }

  updateMsgList(data: any){
    //alert('cleaning');
    this.msgListSource.next(data);
  }


  startChatService(uuid:string){

    this.connectClientWithUsername(uuid).then(()=>{

      this.chatClientStarted = true;

    }).catch(function(error) {
      //alert(error);
      window.location.reload();
      console.log(("connectclient" +JSON.stringify(error, Object.getOwnPropertyNames(error))));
    });


  }



  getUserInfo(): Promise<UserInfo> {
    const userInfo: UserInfo = {
      id: '140000198202211138',
      name: 'Luff',
      avatar: './assets/user.jpg'
    };
    return new Promise(resolve => resolve(userInfo));
  }



// ==========================================

  connectClientWithUsername(username) {
    var self = this;
    // var usernameText = $usernameInput.val();
    // $usernameInput.val('');
    if (username == '') {

      return;
    }
    self.tc.username = username;
    return self.fetchAccessToken(self.tc.username,self.connectMessagingClient.bind(self));
    //return Promise.resolve();
  }



  fetchAccessToken(username, handler) {

    return new Promise((resolve, reject)=> {
      this.http.post('http://www.koomkin.com:4835/token' , {device: "mobile", identity: username})
        .subscribe(data => {

          var token = data['token'];

          handler(token);

          return resolve();

        }, err => {

          console.log(JSON.stringify(err));
          return reject(err);

        });

    });

  }


  connectMessagingClient(token) {

    var self = this;
    self.tc.messagingClient = new window["TwilioChat"].Client(token);
    self.accessManager = window["TwilioCommon"].AccessManager(token);
    return self.tc.messagingClient.initialize()
      .then(() => {

        this.chatClientStarted = true;
        //self.accessManager.on('tokenExpired', function() {
          //window.location.reload();
          // get new token from AccessManager and pass it to the library instance
          //self.tc.messagingClient.updateToken(am.token);
        //});
        //accessManager.on('tokenUpdated', function(am) {
          // get new token from AccessManager and pass it to the library instance
        //  chatClient.updateToken(am.token);
        //});
        //this.updateConnectedUI();
        //this.loadChannelList(this.joinGeneralChannel.bind(this));
        //tc.messagingClient.on('channelAdded', $.throttle(tc.loadChannelList));
        //tc.messagingClient.on('channelRemoved', $.throttle(tc.loadChannelList));
        self.tc.messagingClient.on('tokenExpired', ()=>{self.refreshToken()});
        //this.joinChannel2("HEY HEY");
        // console.log("MessageList:  "+  JSON.stringify(this.tc.channelArray, this.getCircularReplacer()));
      }).catch(function(error) {
        console.log(("" +JSON.stringify(error, Object.getOwnPropertyNames(error))));
      });
  }


  refreshToken() {
    var self = this;

    self.fetchAccessToken(self.tc.username, self.setNewToken.bind(self));
  }

  setNewToken(token) {
    var self = this;
      self.accessManager.updateToken(token);
      window.location.reload();
  }



  connectToChatChannel(channel_uniqueName: string) {

    let self = this;
    this.updateMsgList([]);
    self.tc.messagingClient.getChannelByUniqueName(channel_uniqueName).then((channel) => {
      self.loadingMessagesSource.next(true);
      //alert('spinner active: getting channel');
      this.leaveCurrentChannel().then(() => {
        this.joinChannel(channel).then(() => {
          this.tc.currentChannel.removeAllListeners();
          self.tc.currentChannel.on('messageAdded', (message) => {

            let messageGUI: ChatMessage;

            if(message.type === 'media'){

              if(message.attributes.file_url){

                messageGUI = {
                  userId: message.author,
                  time: message.timestamp,
                  message: message.body,
                  type: message.type,
                  url: this.getAwsLeadImageUrl(message).then((url)=>{return url }).catch((url)=>{ return url}),
                  attributes: message.attributes,
                  contentType: message.attributes.mime,
                  filename: message.attributes.filename

                }

              }else{

                messageGUI = {
                  userId: message.author,
                  time: message.timestamp,
                  message: message.body,
                  type: message.type,
                  url: this.getTwilioImageUrl(message),
                  attributes: message.attributes,
                  contentType: message.media.state.contentType,
                  filename: message.media.filename
                };

              }
            }else{
              messageGUI = {
                userId: message.author,
                time: message.timestamp,
                message: message.body,
                type: message.type,
                url: null,
                attributes: message.attributes,
                contentType: null,
                filename: null
              };
            }


            this.msgListSource.next([messageGUI]);
          });

          this.loadMessages('setupchannel');
        }).catch((error) => {
          self.loadingMessagesSource.next(false);
          //alert('spinner INactive:'+ error);
          // console.log(('joinChannel' + JSON.stringify(error, Object.getOwnPropertyNames(error))));
        });
      }).catch((error) => {
        self.loadingMessagesSource.next(false);
        //alert('spinner INactive:'+ error);
        //  console.log(('leaveCurrentChannel' + JSON.stringify(error, Object.getOwnPropertyNames(error))));
      });
    }).catch((error) => {
      self.loadingMessagesSource.next(false);
      //alert('spinner INactive:'+ error);
      // console.log(('getChannelByUniqueName' + JSON.stringify(error, Object.getOwnPropertyNames(error))));
    });


  }


  joinChannel(_channel) {
    const self = this;
    return _channel.join().then((joinedChannel) => {
      self.tc.currentChannel = _channel;
      return joinedChannel;
    }).catch(function (error) {
      self.tc.currentChannel = _channel;
      return _channel;
    });
  }

  leaveCurrentChannel() {
    let self = this;

    if (this.tc.currentChannel) {
      return this.tc.currentChannel.leave().then((leftChannel) => {
        // this.longitudConversacionSource.next(0);
        leftChannel.removeListener('messageAdded', () => { console.log("leaving current channel") });

        return Promise.resolve();
      }).catch(function (error) {
        console.log(('leave error' + JSON.stringify(error, Object.getOwnPropertyNames(error))));
        //alert('hey boy');
      });
    } else {
      //alert('no hay ningún canal');
      return Promise.resolve();
    }
  }



  loadMessages(fromstring: string): any {

    var arr : Array<ChatMessage>;
    arr = [];
    var self = this;

    if(fromstring === "setupchannel"){
      this.loadingMessagesSource.next(true);
    }

    return self.tc.currentChannel.getMessages(self.MESSAGES_HISTORY_LIMIT).then( (messages)=> {

      if(fromstring === "setupchannel"){

        this.loadingMessagesSource.next(false);

      }

      const totalMessages = messages.items.length;

      this.longitudConversacionSource.next(totalMessages);

      for (let i = 0; i < totalMessages; i++) { //iterar sobre mensajes

        const message = messages.items[i]; //Extrae mensaje

        let messageGUI: ChatMessage;

        if(message.type === 'media'){

          //console.log(message.media);
          //console.log(message.attributes)
          //console.log(message.author)

          if(message.attributes.file_url){

            messageGUI = {
              userId: message.author,
              time: message.timestamp,
              message: message.body,
              type: message.type,
              url: this.getAwsLeadImageUrl(message),
              attributes: message.attributes,
              contentType: message.attributes.mime,
              filename: this.getFileName(message.attributes.file_url)
            }

          }else{

            messageGUI = {
              userId: message.author,
              time: message.timestamp,
              message: message.body,
              type: message.type,
              url: this.getTwilioImageUrl(message),
              attributes: message.attributes,
              contentType: message.media.state.contentType,
              filename: message.media.state.filename

            };

          }


        }else{
          messageGUI = {
            userId: message.author,
            time: message.timestamp,
            message: message.body,
            type: message.type,
            url: null,
            attributes: message.attributes,
            contentType: null,
            filename: null
          };
        }
        arr.push(messageGUI);

      }

      console.log('Total Messages:' + totalMessages);


      this.msgListSource.next(arr);

      return Promise.resolve(arr);

    }).catch(function(error) {

      if(fromstring === "setupchannel"){

        this.loadingMessagesSource.next(false);

      }

      console.log(("PROBLEM" +JSON.stringify(error, Object.getOwnPropertyNames(error))));

      //self.content.scrollToBottom(   "hey"  );
      return Promise.resolve(arr);
    });

  };

  //showLoader() {
  //  this.loading = this.loadingCtrl.create({
  //    content: 'Cargando Mensajes...'
  //  });
  //  this.loading.present();

  //}

  getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  };


  mostrarAlertaEnviarSolicitudChat(messageTitle: string, messageSubTitle: string) {
    let alert = this.alertCtrl.create({
      title: messageTitle,
      subTitle: messageSubTitle,
      buttons: [
        {
          text: 'Enviar Solicitud',
          handler: data => {
            //this.mandarSolicitudChat();
            //this.setStorage(this.leadActual.clave,Date.now()+ 1*1800000).then(()=>{

            //});

            // this.page='Lead';
          }
        }
      ]

    });
    alert.present();
  }


  getAwsLeadImageUrl(message){

    var url = message.attributes.file_url;
    var mime = message.attributes.mime;

    return new Promise((resolve, reject) => {

      this.http2.get(url, {}, {'Content-Type': mime})
        .then(data => {

          const blob = new Blob([data.data],{type:mime});
          const result = window.URL.createObjectURL(blob);

          resolve(this.sanitizer.bypassSecurityTrustResourceUrl(url));

        })
        .catch(error => {

          console.log(JSON.stringify(error));
          reject(error.url);


        });

    });

  }

  getTwilioImageUrl(message){

    return new Promise((resolve, reject) => {

      message.media.getContentUrl().then((url) => {

        this.http2.get(url,{},{'Content-Type': message.media.contentType}).then(data => {

          const blob = new Blob([data.data],{type: message.media.contentType});

          const result = window.URL.createObjectURL(blob);


          resolve(this.sanitizer.bypassSecurityTrustResourceUrl(url));


        }).catch((err) => {

          console.log(JSON.stringify(err));
          reject();

        });

      }).catch((error)=>{

        console.log(error);
        reject(error);

      });
    });
  }

  getFileName(url){

      let fileName = url.substr(url.lastIndexOf('/')+1);
      return fileName

  }

}

export class ChatMessage {
  userId: string;
  time: number | string;
  message: string;
  type: string;
  url: any;
  attributes: any;
  contentType: any;
  filename: any;

}

export class UserInfo {
  id: string;
  name?: string;
  avatar?: string;
}











