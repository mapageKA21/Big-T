'use strict';
//name: Big-T
//username: DChamp_Bot

const nconf = require('nconf');

const TelegramBot = require('node-telegram-bot-api');
const tournament = require('./tournament.js');

nconf.argv().env()
  .file({ file: './.env.json' });

const token = nconf.get('TELEGRAM_TOKEN');

// Setup polling way
const bot = new TelegramBot(token, {polling: true});


let NewT = function (chatId, chatAdmin) {
  this.chatId = chatId;
  this.chatAdmin = chatAdmin;
  this.players = [];
  this.playingPlayers = [];
  this.theFinalPlayers = [];
  this.myState = {
    registring: false,
    playing: false
  };
  this.newT;
}

let chatsOpen = [];

bot.on('message', function (msg) {
  let chatId = msg.chat.id;

  if (msg.group_chat_created) {
    let chatId = msg.chat.id;
    bot.getChatAdministrators(chatId).then(function(data) {
      let chatAdmin = data[0].user.username;
      chatsOpen.push(new NewT(chatId,chatAdmin));
    }).catch(function(err) {
      })
  }

  if (msg.new_chat_member) {
    if (msg.new_chat_member.username === 'DChamp_Bot') {
      let chatId = msg.chat.id;
      bot.getChatAdministrators(chatId).then(function(data) {
        let chatAdmin = data[0].user.username;
        chatsOpen.push(new NewT(chatId,chatAdmin));
      }).catch(function(err) {
        })
    }
  }

  for (var i = 0; i < chatsOpen.length; i++) {
    if (chatsOpen[i].chatId === chatId) {
      if (msg.from.username === chatsOpen[i].chatAdmin) { 
        if (chatsOpen[i].theFinalPlayers.includes(msg.text)) {
          setTimeout (function () { 
            bot.sendMessage(chatId, `Tournament ended. Congratulations to ${msg.text}!`);
          }, 600); 
          let video = './messilegend.mp4';
          bot.sendVideo(chatId, video);      
          let photo = './winner.gif';
          bot.sendDocument(chatId, photo, {caption: "Who's next?"});
          chatsOpen[i].theFinalPlayers = [];
        }

      if (chatsOpen[i].playingPlayers.includes(msg.text)) {
        let winner = msg.text;
        // winner goes to next round
        chatsOpen[i].newT.passRound(winner);
        let nextMatch = chatsOpen[i].newT.nextMatch();
        if (nextMatch.round === 'final') {
          chatsOpen[i].theFinalPlayers = [nextMatch.player1, nextMatch.player2];
          bot.sendMessage(chatId, `FINAL MATCH: ${nextMatch.player1} VS ${nextMatch.player2}`);
          let opts = {
            reply_markup: JSON.stringify({ 
              keyboard: [chatsOpen[i].theFinalPlayers],
              one_time_keyboard: true,
              resize_keyboard: true
            })
          };
          setTimeout (function () { 
            bot.sendMessage(chatId, `Who is the CHAMPION? Choose the winner by clicking the button below.`, opts);
          }, 600);
          chatsOpen[i].myState.registring = false;
          chatsOpen[i].myState.playing = false;
          chatsOpen[i].newT = undefined;
          chatsOpen[i].players = [];
          chatsOpen[i].playingPlayers = [];
        } else {
            chatsOpen[i].playingPlayers = [nextMatch.player1, nextMatch.player2];
            bot.sendMessage(chatId, `Next Match: ${nextMatch.player1} VS ${nextMatch.player2}`);
            let opts = {
              reply_markup: JSON.stringify({ 
                keyboard: [chatsOpen[i].playingPlayers],
                one_time_keyboard: true,
                resize_keyboard: true
              })
            };
            setTimeout (function () { 
              bot.sendMessage(chatId, `Who won the match? Choose the winner by clicking the button below.`, opts);    
            }, 600);
          }
        }
      } 
    }
  }
});

// Matches /start command
bot.onText(/\/start/, function (msg, match) {
  let chatId = msg.chat.id;
  let respNew = `
    *Welcome!*

Before we start the tournament, every player has to register.

Please type /register to register at the tournament.
Every player has to send /register.

When ready, the administrator has to type /go to start the tournament.

Players can send /next to know the next opponent.
    
    `;

  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatsOpen[i].chatId === chatId) {
      if (msg.from.username === chatsOpen[i].chatAdmin) {
        if (chatsOpen[i].myState.playing === false) {
          if (chatsOpen[i].myState.registring === false){
            chatsOpen[i].myState.registring = true;  
            bot.sendMessage(chatId, respNew, {parse_mode: 'Markdown'});
          } else {
            bot.sendMessage(chatId, 'You are already registering in a tournament. Send /go to start when all players are registered.');          
          }
        } else {
          bot.sendMessage(chatId, `Can't play more than one tournament at once`);
        }
      } else {
        bot.sendMessage(chatId, `Only ${chatsOpen[i].chatAdmin} can send me commands!`);
      }
    }
  }
});

bot.onText(/\/help/, function (msg, match) {
  let chatId = msg.chat.id;
  let resp = `
    To start a tournament you have to add me to a Telegram group.
    
Then type /start to start a tournament!
Every player has to register before the tournament starts.
Once the tournament has started, only the group administrator can send me commands, except /next.
Players can type /next to know the next opponent.

You can control me by sending these commands:

  /start - start the registration process
  /register - register at the tournament
  /go - start the tournament
  /help - list of commands and help
  /deletetournament - delete an existing tournament
  /next - show next opponent
    
    `;

  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatsOpen[i].chatId === chatId) {
      if (msg.from.username === chatsOpen[i].chatAdmin) {
          bot.sendMessage(chatId, resp, {parse_mode: 'Markdown'});
        } else {
            bot.sendMessage(chatId, `Only ${chatsOpen[i].chatAdmin} can send me commands!`);
          }
    }
  }
});

bot.onText(/\/register/, function (msg, match) {
  let chatId = msg.chat.id;
  let user = msg.from.username;

  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatId === chatsOpen[i].chatId) {
      if (chatsOpen[i].myState.registring) {
        if (chatsOpen[i].players.indexOf(user) === -1) {
          chatsOpen[i].players.push(user);
          let resp = `
        ${user} has been registered! 
Current players registered: ${chatsOpen[i].players.length}
      `;
        bot.sendMessage(chatId, resp);
        } else { bot.sendMessage(chatId, `You can't register more than once!`)} 
      } else {
          bot.sendMessage(chatId, `Registrations are closed. /start a tournament if you haven't yet.`);
       }
    }
  }
});

bot.onText(/\/next/, function (msg, match) {
  let chatId = msg.chat.id;
  let user = msg.from.username;

  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatId === chatsOpen[i].chatId) {
      if (chatsOpen[i].myState.playing) {
        if (chatsOpen[i].players.includes(user) || chatsOpen[i].playingPlayers.includes(user) || chatsOpen[i].theFinalPlayers.includes(user)) {
          let opponent = chatsOpen[i].newT.nextOpponent(user); 
          let resp = `
            ${user} your opponent is ${opponent} 
          `;
        bot.sendMessage(chatId, resp);
        } else { 
          bot.sendMessage(chatId, `You are not playing the current tournament`);
          }
      } else {
          bot.sendMessage(chatId, `Not playing any tournament yet.`);
        }
    }
  }
});

bot.onText(/\/go/, function (msg, match) {
  let chatId = msg.chat.id;
  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatId === chatsOpen[i].chatId) {
      if (msg.from.username === chatsOpen[i].chatAdmin) {
        if (chatsOpen[i].players.length < 4) { 
          bot.sendMessage(chatId, `You need at least 4 players to start a tournament and you are only ${chatsOpen[i].players.length}!`);
        } else {
          //set states, create and show the tournament
          chatsOpen[i].myState.registring = false;
          chatsOpen[i].myState.playing = true;
          let number = chatsOpen[i].players.length;
          chatsOpen[i].newT = tournament.createTournament(chatsOpen[i].players);
          bot.sendMessage(chatId, `New tournament created with ${number} players! Start!`);

          // shows next match and ask for the winner
          let nextM = chatsOpen[i].newT.nextMatch();
          chatsOpen[i].playingPlayers = [nextM.player1, nextM.player2];
          bot.sendMessage(chatId, `Next Match: ${nextM.player1} VS ${nextM.player2}`);
          let opts = {
            reply_markup: JSON.stringify({ 
              keyboard: [chatsOpen[i].playingPlayers],
              one_time_keyboard: true,
              resize_keyboard: true
            })
          };
          setTimeout (function () { 
            bot.sendMessage(chatId, `Who won the match? Choose the winner by clicking the button below.`, opts);    
          }, 600);          
        }
      } else {
          bot.sendMessage(chatId, `Only ${chatsOpen[i].chatAdmin} can send me commands!`);  
        }
    }
  }
});


bot.onText(/\/deletetournament/, function (msg, match) {
  let chatId = msg.chat.id;
  let opts = {
    reply_markup: JSON.stringify({ 
    keyboard: [[`YES`, `NO`]],
    one_time_keyboard: true,
    resize_keyboard: true
    })
  };

  for (let i = 0; i < chatsOpen.length; i++) {
    if (chatId === chatsOpen[i].chatId) {
      if (msg.from.username === chatsOpen[i].chatAdmin) {
        if (chatsOpen[i].myState.playing) {
          bot.sendMessage(chatId, `Are you sure?`, opts);
          bot.onText(/YES/, function (msg, match) {
            if (msg.from.username === chatsOpen[i].chatAdmin) {
              chatsOpen[i].myState.registring = false;
              chatsOpen[i].myState.playing = false;
              chatsOpen[i].newT = undefined;
              chatsOpen[i].players = [];
              chatsOpen[i].playingPlayers = [];
              chatsOpen[i].theFinalPlayers = [];
              bot.sendMessage(chatId, `Current tournament deleted`);
            }
          })
          bot.onText(/NO/, function (msg, match) {
            if (msg.from.username === chatsOpen[i].chatAdmin) {
              bot.sendMessage(chatId, `The tournament has not been deleted`);
            }
          })
        } else {
            bot.sendMessage(chatId, `You are not playing any tournament!`);
          }
      } else {
          bot.sendMessage(chatId, `Only the group admin can send me commands!`);
        }
    }
  }
});
