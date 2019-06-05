import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import io from "socket.io-client";
import { resetCompiledComponents } from '@angular/core/src/render3/jit/module';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private context: any;
  private socket: any;

  //Visuals
  public user: string;
  public connected: boolean;

  public top: Card[];
  public mid: Card[];
  public bot: Card[];
  public you: Card[];
  public selected: Card;
  public drawn: boolean;
  public done: number;
  public round: number;
  public gamesPlayed: number;

  public player1: string;
  public player2: string;

  public p1top: string[];
  public p1mid: string[];
  public p1bot: string[];

  public p2top: string[];
  public p2mid: string[];
  public p2bot: string[];

  public lastHand: string;
  public player1Hand: string;
  public player2Hand: string;
  public busted = new Array();

  public holdVal: string;

  public ngOnInit() {
    this.reset();
    this.user = "";
    this.connected = false;
    this.player1 = "";
    this.player2 = "";
    this.round = 1;
    this.drawn = false;
    this.done = 3;
    this.gamesPlayed = -1;
  }

  public ngOnDestroy() {
    var player = {
      name: this.user,
      top: this.top,
      mid: this.mid,
      bot: this.bot
    }
    this.socket.emit("leave", player);
  }

  public connect() {
    if (this.user) {
      this.connected = true;
      this.socket = io(environment.socket);
      this.socket.emit("join", this.user);

      //Get cards
      this.socket.on("cards", data => {
        if (data.target == this.user) {
          this.drawn = true;
          this.done = 0;
          this.you = new Array();
          for (let i of data.cards) {
            var url = "../assets/images/" + i + ".jpg";
            var card: Card = {
              value: i,
              image: url,
              locked: false
            }
            this.you.push(card);
          }
        }
      })

      //Player Update
      this.socket.on("playerUpdate", data => {
        if (data.target == this.user) {
          if (this.player1 == "") {
            this.player1 = data.player;
          }
          else {
            if (data.player != this.player1) {
              this.player2 = data.player;
            }
          }
        }
      })

      //Player Leave
      this.socket.on("playerLeave", data => {
        if (data.target == this.user) {
          if (data.player == this.player1) {
            this.player1 = '';
            this.player1Hand = '';
          }
          else {
            this.player2 = '';
            this.player2Hand = '';
          }
        }
      })

      //Round End
      this.socket.on("roundEnd", data => {
        if (data.target == this.user) {
          this.done = 1;
          for (let i of data.players) {
            if (i.name == this.player1) {
              this.p1top = this.imageConvert(i.top, true);
              this.p1mid = this.imageConvert(i.mid, false);
              this.p1bot = this.imageConvert(i.bot, false);
            }
            if (i.name == this.player2) {
              this.p2top = this.imageConvert(i.top, true);
              this.p2mid = this.imageConvert(i.mid, false);
              this.p2bot = this.imageConvert(i.bot, false);
            }
          }
          if (!data.over) {
            this.round++;
            this.drawn = false;
          }
        }
      })

      //Wait next
      this.socket.on("waitNext", data => {
        this.done = 3;
        console.log(data);
        for (let i in data.players) {
          if (data.players[i].name == this.user) {
            if(!data.valids[i]) {
              this.busted[0] = true;
            }
            this.lastHand = data.hands[i];
          }
          if (data.players[i].name == this.player1) {
            if(!data.valids[i]) {
              this.busted[1] = true;
            }
            this.player1Hand = data.hands[i];
          }
          if (data.players[i].name == this.player2) {
            if(!data.valids[2]) {
              this.busted[2] = true;
            }
            this.player2Hand = data.hands[i];
          }
        }
      })

      //Game End
      this.socket.on("newGame", data => {
        if (data.target == this.user) {
          this.gamesPlayed++;
          this.reset();
          this.you = new Array();
          for (let i of data.cards) {
            var url = "../assets/images/" + i + ".jpg";
            var card: Card = {
              value: i,
              image: url,
              locked: false
            }
            this.you.push(card);
          }
          this.drawn = true;
          this.done = 0;
        }
      })
    }
  }

  public imageConvert(row: string[], top: boolean) {
    for (let i in row) {
      row[i] = "../assets/images/" + row[i] + ".jpg";
    }
    if (top && row.length < 3) {
      while (row.length < 3) {
        row.push("../assets/images/def2.jpg");
      }
    }
    if (!top && row.length < 5) {
      while (row.length < 5) {
        row.push("../assets/images/def2.jpg");
      }
    }
    return row;
  }

  public draw() {
    if (!this.drawn) {
      this.socket.emit("draw", this.user);
      this.drawn = true;
      this.done = 0;
    }
  }

  public leave() {
    var player = {
      name: this.user,
      top: this.top,
      mid: this.mid,
      bot: this.bot
    }
    this.socket.emit("leave", player);
    this.player1 = '';
    this.player2 = '';
    this.connected = false;
  }

  public checkEnter(event: any) {
    if (event.key == 'Enter') {
      this.connect();
    }
  }

  public grab(card: Card, row: Card[], pos: number) {
    //Place
    if (this.selected) {
      //Free
      if (card.value == '' && !card.locked) {
        row[pos] = {
          value: this.selected.value,
          image: this.selected.image,
          locked: false
        };
        this.selected = null;
      }
      //Not Free
    }
    //Pickup
    else {
      if (!card.locked && card.value != '') {
        console.log("grab");
        row[pos] = {
          value: '',
          image: "../assets/images/def.jpg",
          locked: false
        }
        this.selected = {
          value: card.value,
          image: card.image,
          locked: false
        }
      }
    }
  }

  public submit() {
    if (this.validSubmit()) {
      this.done = 2;
      var cards = new Array();
      var url = "../assets/images/def.jpg"
      this.you = new Array();
      this.selected = null;
      for (let i = 0; i < 5; i++) {
        var cardDraw: Card = {
          value: '',
          image: url,
          locked: true
        }
        this.you.push(cardDraw);

        if (!this.mid[i].locked && this.mid[i].value != '') {
          var packet: Packet = {
            value: this.mid[i].value,
            row: 'mid',
            pos: i
          }
          cards.push(packet);
          this.mid[i].locked = true;
        }
        if (!this.bot[i].locked && this.bot[i].value != '') {
          var packet: Packet = {
            value: this.bot[i].value,
            row: 'bot',
            pos: i
          }
          cards.push(packet);
          this.bot[i].locked = true;
        }
        if (i < 3) {
          if (!this.top[i].locked && this.top[i].value != '') {
            var packet: Packet = {
              value: this.top[i].value,
              row: 'top',
              pos: i
            }
            cards.push(packet);
            this.top[i].locked = true;
          }
        }
      }
      var data = {
        name: this.user,
        cards: cards
      }
      this.socket.emit("cards", data);
    }
    else {
      alert("Invalid Submission");
    }
  }

  public ready() {
    this.socket.emit("nextRound", this.user)
    this.done = 2;
  }

  public validSubmit() {
    let count = this.placedCount();
    let valid = false;
    if (this.round == 1) {
      if (count == 5) {
        valid = true;
      }
    }
    else {
      if (count == 2) {
        valid = true;
      }
    }
    return valid;
  }

  public placedCount() {
    let count = 0;
    for (let i = 0; i < 5; i++) {
      if (!this.mid[i].locked && this.mid[i].value != '') {
        count++;
      }
      if (!this.bot[i].locked && this.bot[i].value != '') {
        count++;
      }
      if (i < 3) {
        if (!this.top[i].locked && this.top[i].value != '') {
          count++;
        }
      }
    }
    return count;
  }

  public reset() {
    this.lastHand = '';
    this.player1Hand = '';
    this.player2Hand = '';
    this.busted = [false, false, false];
    this.top = new Array();
    this.mid = new Array();
    this.bot = new Array();
    this.you = new Array();
    this.p1top = new Array();
    this.p1mid = new Array();
    this.p1bot = new Array();
    this.p2top = new Array();
    this.p2mid = new Array();
    this.p2bot = new Array();
    this.selected = null;
    this.round = 1;
    this.drawn = false;
    this.done = 3;
    for (let i = 0; i < 5; i++) {
      var url = "../assets/images/def.jpg";
      var cardDraw: Card = {
        value: '',
        image: url,
        locked: true
      }
      this.you.push(cardDraw);

      var url = "../assets/images/def.jpg";
      var cardTabe: Card = {
        value: '',
        image: url,
        locked: false
      }
      this.mid.push(cardTabe);
      this.bot.push(cardTabe);

      this.p1mid.push('../assets/images/def2.jpg');
      this.p1bot.push('../assets/images/def2.jpg');
      this.p2mid.push('../assets/images/def2.jpg');
      this.p2bot.push('../assets/images/def2.jpg');
      if (i < 3) {
        this.top.push(cardTabe);
        this.p1top.push('../assets/images/def2.jpg');
        this.p2top.push('../assets/images/def2.jpg');
      }
    }
  }

}

interface Card {
  value: string,
  image: string,
  locked: boolean
}

interface Packet {
  value: string,
  row: string,
  pos: number
}

interface User {
  name: string,
  top: string[],
  mid: string[],
  bot: string[]
}