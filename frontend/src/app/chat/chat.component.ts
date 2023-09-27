import { Component, Injectable } from '@angular/core';

import { delay } from 'rxjs';
import { io } from 'socket.io-client';
import { AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { Message, User, Channel, ChannelUser, ChatData, UserStatus } from './interfaces/message';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FriendlistComponent} from '../friendlist/friendlist.component';
import { WebSocketService } from '../game/websocket/websocket.service';
import { environment } from 'src/environments/environment';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Injectable()

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements AfterViewChecked {


    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        if (this.messagesContainer) {
            this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        }
    }

    socket: any;

    newPrvtchat: string = '';
    channel: Channel = {
        id: 0,
        name: '',
        private_channel: false,
        password: ''
    }
    message: Message = {
        author: '',
        content: '',
        owner_id: 0,
        channel_id: 0,
        isSystemMessage: false,
        created_at: new Date()
    }
    messageContent: string = '';
    isRegistered: boolean = false;
    messages: Message[] = [];
    typingDisplay: string = '';



    userToGame: User = {
        id_42: 0,
        name: ''
    }

    userToMute: User = {
        id_42: 0,
        name: ''
    }

    userToKick: User = {
        id_42: 0,
        name: ''
    }

    userToBan: User = {
        id_42: 0,
        name: ''
    }

    channelUsers: ChannelUser[] = [];
    userToPromote: User = {
        id_42: 0,
        name: ''
    }

    userToBlock: User = {
        id_42: 0,
        name: ''
    }

    userToUnblock: User = {
        id_42: 0,
        name: ''
    }

    userPrvtchat: User = {
        id_42: 0,
        name: ''
    }

    channelToJoin: Channel = {
        id: 0,
        name: '',
        private_channel: false,
        password: ''
    }

    channelToCreate: Channel = {
        id: 0,
        name: '',
        private_channel: false,
        password: ''
    }

    selectedChannel: Channel = {
        id: 0,
        name: '',
        private_channel: false,
        password: ''
    }


    user: User = {
        id_42: 0,
        name: ''
    };
    publicChannels: Channel[] = [];
    userChannels: Channel[] = [];
    blockedUsers: User[] = [];


    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private router: Router,
        private snackBar: MatSnackBar,
        private webservice: WebSocketService) {

        // this.socket = io('http://localhost:3001');

        this.webservice.socket.on('message', (message: Message) => {
            // ////console.log(JSON.stringify(message));
            // ////console.log('Message called');
            if (!this.blockedUsers.some(user => user.id_42 === message.owner_id) && message.channel_id === this.channel.id) {
                this.messages.push(message);
            }
            // if(message.isSystemMessage === true &&  message.content.includes(`${this.user.name} was banned from channel`))
            //     location.reload();
            // if(message.isSystemMessage === true &&  message.content.includes(`${this.user.name} was kicked from channel`))
            //     location.reload();
        });

        this.webservice.socket.on('ChannelMessages', (messageArray: Message[]) => {
            const filteredMessages = messageArray.filter(message => !this.blockedUsers.some(user => user.id_42 === message.owner_id));
            this.messages.push(...filteredMessages);
            // ////console.log(JSON.stringify(this.messages));

        });


        this.webservice.socket.on('updatePublicChannels', (data: { publicChannels: Channel[] }) => {
                this.publicChannels = data.publicChannels;
        });

        this.webservice.socket.on('userChannels', (channels: any[]) => {
            this.userChannels = channels;
        });

        this.webservice.socket.on('blockedUsers', (users: User[]) => {
            this.blockedUsers = users;
        })

        this.webservice.socket.on('identifyDone', (user: User) => {
            this.user = user;
            this.isRegistered = true;
        });

        this.webservice.socket.on('channelInfo', (channel: Channel) => {
            this.channel = channel;
        });

        this.webservice.socket.on('updateChannelUsers', (data: {channel: Channel, channelUsers: ChannelUser[]}) => {
            if (data.channel.id === this.channel.id)
                this.channelUsers = data.channelUsers;
        });

        this.webservice.socket.on('channelDeleted', (channel: Channel) => {
            this.userChannels = this.userChannels.filter(channel => channel.id !== channel.id);
            this.snackBar.open('Channel ' + channel.name + ' was deleted', 'Close', { duration: 5000, });
            if (channel.id === this.channel.id)
                this.flushChannel();
        });

        this.webservice.socket.on('gotBanned', (channelIn: Channel) => {
            this.userChannels = this.userChannels.filter(channel => channel.id !== channelIn.id);
            this.snackBar.open('You were banned from channel ' + channelIn.name, 'Close', { duration: 5000, });
            if (channelIn.id === this.channel.id)
                this.flushChannel();
        });

        this.webservice.socket.on('gotKicked', (channelIn: Channel) => {
            this.userChannels = this.userChannels.filter(channel => channel.id !== channelIn.id);
            this.snackBar.open('You were kicked from channel ' + channelIn.name, 'Close', { duration: 5000, });
            if (channelIn.id === this.channel.id)
                this.flushChannel();
        });

        this.webservice.socket.on('gotMuted', (channelIn: Channel) => {
            this.snackBar.open('You were muted from channel ' + channelIn.name, 'Close', { duration: 5000, });
        });

        this.webservice.socket.on('gotPromoted', (channelIn: Channel) => {
            this.snackBar.open('You were promoted in channel ' + channelIn.name, 'Close', { duration: 5000, });
        });

        this.webservice.socket.on('gotBlocked', (data: {user: User}) => {
            this.snackBar.open('You were blocked by ' + data.user.name, 'Close', { duration: 5000, });
        });

        this.webservice.socket.on('gotUnblocked', (data: {user: User}) => {
            this.snackBar.open('You were unblocked by ' + data.user.name, 'Close', { duration: 5000, });
        });

        this.webservice.socket.on('updateBlockedUsers', (data: {blockedUsers: User[]}) => {
            this.blockedUsers = data.blockedUsers;
        });

        this.webservice.socket.on('userStatus', (user: User, status: UserStatus) => {
            this.updateChannelUser(user, status);
          });  
      

    }


    updateChannelUser(user: User, status: UserStatus) {
        if (this.channelUsers.some(channelUser => channelUser.id_42 === user.id_42)) {
            const channelUser = this.channelUsers.find(channelUser => channelUser.id_42 === user.id_42);
            if (channelUser)
                channelUser.status = status;
        }
    }
    
    async ngOnInit(): Promise<void> {
        this.loadUserData();
    };



 slectedAdminAction: string = '';
    selectedUser: User = {
        id_42: 0,
        name: ''
    };
    performAction() {
        switch (this.slectedAdminAction) {
            case 'promote':
                this.promoteUser(this.selectedUser);
                break;
            case 'kick':
                this.kickUser(this.selectedUser);
                break;
            case 'ban':
                this.banUser(this.selectedUser);
                break;
            case 'mute':
                this.muteUser(this.selectedUser);
                break;
            default:
                this.snackBar.open('Please select an action', 'Close', { duration: 5000, });
                break;
        }
    }











    async joinChannelWrapper(channel: Channel): Promise<void> {
        this.channelData.name = channel.name;
        this.joinChannel(this.channelData);
    }

    private saveUserData(data: { user: User; publicChannels: Channel[]; userChannels: Channel[]; blockedUsers: User[]; }) {
        this.user = data.user;
        if (data.publicChannels)
            this.publicChannels = data.publicChannels;
        if (data.userChannels)
            this.userChannels = data.userChannels;
        if (data.blockedUsers)
            this.blockedUsers = data.blockedUsers;
        //////console.log(data.userChannels);
    }

    private saveChannelData(data: { channel: Channel; channelUsers: ChannelUser[]; messages: Message[]; }) {
        this.flushChannel();
        if (data.channel)
            this.channel = data.channel;
        if (data.channelUsers)
            this.channelUsers = data.channelUsers;
        if (data.messages)
        {
            const filteredMessages = data.messages.filter(message => !this.blockedUsers.some(user => user.id_42 === message.owner_id));
            this.messages = filteredMessages;
        }
    }


    loadUserData(): void {
        this.http.get<{ user: User, publicChannels: Channel[], userChannels: Channel[], blockedUsers: User[] }>(environment.apiUrl + `chat/get-user-data`, { withCredentials: true })
            .pipe(
                catchError((error: any) => {
                this.snackBar.open('Error load user data: ' + error.error.message, 'Close', { duration: 5000, });
                    return of(null);
                })
            )
            .subscribe(data => {
                if (data) {  // Add this check, as data might be null in case of an error
                    this.saveUserData(data);
                    this.updateSocketId();
                    this.isRegistered = true;
                }
            })
    }




    createChannel(channel: Channel): void {
        this.http.post<{channel: Channel, channelUsers: ChannelUser[], messages: Message[]  }>(environment.apiUrl + `chat/create-channel`, { channel: channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.flushChannelData();
                    this.snackBar.open('Error creating channel: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                })
            )
            .subscribe(data => {
                if (data) {
                    this.saveChannelData(data);
                    this.userChannels.push(data.channel)
                    if (this.channel.private_channel) {
                        this.snackBar.open('Private channel created successfully', 'Close', { duration: 5000, });
                    } else {
                        this.snackBar.open('Public channel created successfully', 'Close', { duration: 5000, });
                    }
                }
            })
    }

    joinChannel(channel: Channel): void {
        this.http.post<{channel: Channel, channelUsers: ChannelUser[], messages: Message[]  }>(environment.apiUrl + `chat/join-channel`, { channel: channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.flushChannelData();
                    this.snackBar.open('Error joining channel: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                })
            )
            .subscribe(data => {
                if (data) {
                    this.saveChannelData(data);
                    this.userChannels.push(this.channel);
                    this.snackBar.open('Channel joined successfully', 'Close', { duration: 5000, });
                }
            })
    }

    leaveChannel(): void {
        this.http.post<{userChannels: Channel[]}>(environment.apiUrl + `chat/leave-channel`, { channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.snackBar.open('Error leaving channel: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                })
            )
            .subscribe(data => {
                if (data) {
                    this.flushChannel();
                    if (data.userChannels)
                        this.userChannels = data.userChannels;
                        ////console.log(JSON.stringify(this.publicChannels));
                    this.snackBar.open('Channel left successfully', 'Close', { duration: 5000, });
                }
            })
    }

    blockUser(): void {
        this.http.post<{ blockedUsers: User[] }>(environment.apiUrl + `chat/block-user`, { user: this.userToBlock }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.snackBar.open('Error blocking user: ' + error.error.message, 'Close', { duration: 5000, });
                    this.userToBlock = this.flushUser(this.userToBlock);
                    return throwError(error);
                })
            )
            .subscribe(data => {
                if (data) {
                    this.userToBlock = this.flushUser(this.userToBlock);
                    this.blockedUsers = data.blockedUsers;
                    this.snackBar.open('User blocked successfully', 'Close', { duration: 5000, });
                }
            })
    }

    unblockUser(): void {
        this.http.post<{ blockedUsers: User[] }>(environment.apiUrl + `chat/unblock-user`, { user: this.userToUnblock }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.snackBar.open('Error unblocking user: ' + error.error.message, 'Close', { duration: 5000, });
                    this.userToUnblock = this.flushUser(this.userToUnblock);
                    return throwError(error);

                })
            )
            .subscribe(data => {
                if (data) {
                    this.userToUnblock = this.flushUser(this.userToUnblock);
                    this.blockedUsers = data.blockedUsers;
                    if (!data.blockedUsers)
                        this.blockedUsers = [];
                    console.log(JSON.stringify(this.blockedUsers));
                    this.snackBar.open('User unblocked successfully', 'Close', { duration: 5000, });
                }
            })
    }

    startPrivateChat(): void {
        ////console.log(JSON.stringify(this.userPrvtchat));
        this.http.post<{ channel: Channel }>(environment.apiUrl + `chat/start-private-chat`, { user: this.userPrvtchat }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userPrvtchat = this.flushUser(this.userPrvtchat);
                    this.snackBar.open('Error starting private chat: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.flushChannel();
                    this.userPrvtchat = this.flushUser(this.userPrvtchat);
                    this.channel = data.channel;
                    this.userChannels.push(this.channel);
                    this.snackBar.open('Private chat started successfully', 'Close', { duration: 5000, });
                }
            })
    }

    setPassword(): void {
        ////console.log(JSON.stringify(this.channel));
        this.http.post<{ channel: Channel }>(environment.apiUrl + `chat/set-password`, { channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.snackBar.open('Error setting password: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.channel = data.channel;
                    this.snackBar.open('Password set successfully', 'Close', { duration: 5000, });
                }
            })
    }

    promoteUser(slectedUser: User): void {
        ////console.log(JSON.stringify(this.userToPromote));
        this.http.post<{ channelUsers: ChannelUser[] }>(environment.apiUrl + `chat/promote-user`, { user: slectedUser, channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userToPromote = this.flushUser(this.userToPromote);
                    this.snackBar.open('Error promoting user: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.userToPromote = this.flushUser(this.userToPromote);
                    this.channelUsers = data.channelUsers;
                    ////console.log(JSON.stringify(this.channelUsers));
                    this.snackBar.open('User promoted successfully', 'Close', { duration: 5000, });
                }
            })
    }

    kickUser(slectedUser: User): void {
        ////console.log(JSON.stringify(this.userToKick));
        this.http.post<{ channelUsers: ChannelUser[] }>(environment.apiUrl + `chat/kick-user`, { user: slectedUser, channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userToKick = this.flushUser(this.userToKick);
                    this.snackBar.open('Error kicking user: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.userToKick = this.flushUser(this.userToKick);
                    this.channelUsers = data.channelUsers;
                    this.snackBar.open('User kicked successfully', 'Close', { duration: 5000, });
                }
            })
    }

    banUser(slectedUser: User): void {
        ////console.log(JSON.stringify(this.userToBan));
        this.http.post<{ channelUsers: ChannelUser[] }>(environment.apiUrl + `chat/ban-user`, { user: slectedUser, channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userToKick = this.flushUser(this.userToBan);
                    this.snackBar.open('Error banning user: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.userToBan = this.flushUser(this.userToBan);
                    this.channelUsers = data.channelUsers;
                    this.snackBar.open('User banned successfully', 'Close', { duration: 5000, });
                }
            })
    }

    muteUser(slectedUser: User): void {
        ////console.log(JSON.stringify(this.userToMute));
        this.http.post<{ channelUsers: ChannelUser[] }>(environment.apiUrl + `chat/mute-user`, { user: slectedUser, channel: this.channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userToMute = this.flushUser(this.userToMute);
                    this.snackBar.open('Error muting user: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.userToMute = this.flushUser(this.userToMute);
                    this.channelUsers = data.channelUsers;
                    this.snackBar.open('User muted successfully', 'Close', { duration: 5000, });
                }
            })
    }

    inviteUserToGame(): void {
        ////console.log(JSON.stringify(this.userToGame));
        this.http.post<{ }>(environment.apiUrl + `chat/invite-user-to-game`, { user: this.userToGame}, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.userToGame = this.flushUser(this.userToGame);
                    this.snackBar.open('Error inviting user to game: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                if (data) {
                    this.userToGame = this.flushUser(this.userToGame);
                    this.snackBar.open('User invited to game successfully', 'Close', { duration: 5000, });
                }
            })
    }

    selectChannel(channel: Channel) {
        this.http.post<{ channel: Channel, channelUsers: ChannelUser[], messages: Message[] }>(environment.apiUrl + `chat/select-channel`, { channel: channel }, { withCredentials: true })
            .pipe(
                catchError((error) => {
                    console.error( error);
                    this.snackBar.open('Error selecting channel: ' + error.error.message, 'Close', { duration: 5000, });
                    return throwError(error);
                }))
            .subscribe(data => {
                // this.flushChannel();
                if (data) {
                    if (data.channel)
                        this.channel = data.channel;
                    if (data.channelUsers)
                        this.channelUsers = data.channelUsers;
                    if (data.messages)
                    {
                        const filteredMessages = data.messages.filter(message => !this.blockedUsers.some(user => user.id_42 === message.owner_id));
                        this.messages = filteredMessages;
                    }
                }
            })
        }

        routeToUser(user: User) {
            this.router.navigate([`/profile/${user.id_42}`]);
        }

    setCurrentChannel(channel: Channel) {
        this.webservice.socket.emit('selectChannel', { channel: channel });
        this.messages = [];
    }

    sendMessage() {
        if (this.message.content.trim() && this.channel.id !== 0) {
            this.message.owner_id = this.user.id_42;
            this.message.channel_id = this.channel.id;   
            this.webservice.socket.emit('createMessage', { message: this.message });
            this.flushMessage();
        }
    }


    updateSocketId() {
        this.webservice.socket.emit('updateSocketId', { user: this.user });
    }


    flushChannel() {
        this.messages = [];
        this.channelUsers = [];
        this.typingDisplay = '';
        this.typingDisplay = '';
        this.channel.id = 0;
        this.channel.name = '';
        this.channel.private_channel = false;
        this.channel.password = '';
    }

    flushChannelData() {
        this.channelData.id = 0;
        this.channelData.name = '';
        this.channelData.private_channel = false;
        this.channelData.password = '';
    }

    flushMessage() {
        this.message.author = '';
        this.message.content = '';
        this.message.owner_id = 0;
        this.message.channel_id = 0;
        this.message.isSystemMessage = false;
        this.message.created_at = new Date();
    }

    flushUserBlock() {
        this.userToBlock.id_42 = 0;
        this.userToBlock.name = '';
        this.userToUnblock.id_42 = 0;
        this.userToUnblock.name = '';
    }


    flushUser(user : User) {
        user.id_42 = 0;
        user.name = '';
        return user;
    }

    oneVsOne(user: any){
        if(this.user.id_42 === user.id_42)
        {
            this.snackBar.open('Can`t play a game against yourself', 'Close', { duration: 5000, });
            return;
        }
        if (user.status === 'ingame' || user.status === 'offline') {
            this.snackBar.open('User is not available', 'Close', { duration: 5000, });
            return;
        }
        let curUser: {
            id_42: number;
            socketId: string;
            name: string;
        };
 
        let challengedUser :{
            id_42: number;
            socketId: string;
            name: string;   
        }
 
        this.http
        .get<ChatData>(environment.apiUrl + `chat/one-vs-one/${this.user.id_42}`, { withCredentials: true })
        .pipe(
          catchError((error) => {
            console.error(error);
            this.snackBar.open('Error creating Game', 'Close', { duration: 5000 });
            return throwError(error);
          }),
          switchMap((curUserData) => {
            if (curUserData) {
              curUser = curUserData.info;    
              // Make the second HTTP request and switch to it
              return this.http.get<ChatData>(environment.apiUrl + `chat/one-vs-one/${user.id_42}`, { withCredentials: true });
            } else {
              // Return an empty observable if curUserData is undefined
              return of(undefined);
            }
          }),
          catchError((error) => {
            console.error(error);
            this.snackBar.open('Error creating Game', 'Close', { duration: 5000 });
            return throwError(error);
          })
        )
        .subscribe((challengedUserData) => {
          if (challengedUserData) {
            challengedUser = challengedUserData.info;
 
            ////console.log('challengedUser:', challengedUser);
            ////console.log('curUser:', curUser);
            this.webservice.privateLobby('ranked', curUser.name, curUser.id_42.toString(), challengedUser.socketId, challengedUser.name, challengedUser.id_42.toString());
        }
        });
    }


    getUserTooltip(user: ChannelUser): string {
        let tooltip = '';
    
        if (user.owner) {
            tooltip += 'Role: Owner\n';
        }
        else if (user.admin) {
            tooltip += 'Role: Admin\n';
        }
        tooltip += 'Status: ' + user.status;
    
        return tooltip;
    }

    isJoiningChannel : boolean = false;
    channelData: Channel = {
        id: 0,
        name: '',
        private_channel: false,
        password: ''
    }
    performChannelAction() {
        if (this.isJoiningChannel) {
          this.joinChannel(this.channelData);
        } else {
          this.createChannel(this.channelData);
        }
      }




} 