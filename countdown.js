/**
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 window.IOWA = window.IOWA || {};
 IOWA.CountdownTimer = IOWA.CountdownTimer || {};
 
 IOWA.CountdownTimer.MOBILE_BREAKPOINT = 501;
 IOWA.CountdownTimer.MOBILE_MAX_BREAKPOINT = 768;
 IOWA.CountdownTimer.TABLET_BREAKPOINT = 960;
 IOWA.CountdownTimer.DESKTOP_BREAKPOINT = 1400;
 IOWA.CountdownTimer.XLARGE_BREAKPOINT = 4000;
 IOWA.CountdownTimer.MAX_WIDTH = 1800;
 IOWA.CountdownTimer.CENTER_OFFSET = 32;
 IOWA.CountdownTimer.INTRO_LENGTH = 1500;
 
 IOWA.CountdownTimer.Core = function(targetDate, elem) {
   this.targetDate = targetDate;
   this.containerDomElement = elem;
 
   this.isReady = false;
   this.isPlaying = false;
   this.needsCanvasReset = true;
   this.mouseCoords = null;
 
   this.isMobile = (this.containerDomElement.offsetWidth <= IOWA.CountdownTimer.MOBILE_MAX_BREAKPOINT);
   this.firstRun = true;
   this.introRunning = false;
   this.quality = this.isMobile ? 140 : 240;
   this.maxWidth = IOWA.CountdownTimer.MAX_WIDTH;
 
   this.canvasElement = document.createElement('canvas');
 
   this.countdownMargin = 100;
   this.bandGutter = 40;
   this.bandPadding = 8;
   this.strokeWeight = 3;
 
   this.pixelRatio = window.devicePixelRatio;
 
   this.unitsAdded = false;
   this.drawAll = false;
   this.showCurrentTime = !0;
   this.shouldRandomize = false;
   this.currentlyRandomizing = false;
   // this.randomIconStack = IOWA.CountdownTimer.ICON_SHAPES.slice(0);
   this.isCountdownComplete = (new Date()) >= targetDate;
 
   this.posShift = 0;
 
   this.digits = {};
 
   this.onVisibilityChange = this.onVisibilityChange.bind(this);
   this.onResize = this.onResize.bind(this);
   this.onMouseMove = this.onMouseMove.bind(this);
   this.onFrame = this.onFrame.bind(this);
 };
 
 IOWA.CountdownTimer.Core.prototype.onVisibilityChange = function() {
   if (document.hidden) {
     this.pause();
   } else {
     this.play();
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.attachEvents = function() {
   this.containerDomElement.appendChild(this.canvasElement);
 
   document.addEventListener('visibilitychange', this.onVisibilityChange, false);
   window.addEventListener('resize', this.onResize);
   this.containerDomElement.addEventListener('mousemove', this.onMouseMove);
 };
 
 IOWA.CountdownTimer.Core.prototype.detachEvents = function() {
   document.removeEventListener('visibilitychange', this.onVisibilityChange, false);
   window.removeEventListener('resize', this.onResize);
   this.containerDomElement.removeEventListener('mousemove', this.onMouseMove);
 };
 
 IOWA.CountdownTimer.Core.prototype.setUp = function(opt_skipIntro, opt_infiniteIntro) {
   if (this.isReady) {
     return;
   }
 
   this.getDigits();
   this.lastNumbers = this.nextColumnValues(this.targetDate, new Date());
   this.bands = this.createBands();
 
   if (!opt_skipIntro) {
     this.intro = new IOWA.CountdownTimer.Intro(
         this.canvasElement, this.quality, this, opt_infiniteIntro ? null : IOWA.CountdownTimer.INTRO_LENGTH);
   }
 
   // Give canvas element a size early so other elements can animate around it.
   this.resetCanvas();
 
   if (this.intro) {
     // Paint opening frame of intro. Must be after `resetCanvas`, above.
     this.intro.update();
   }
 
   this.needsCanvasReset = true;
   this.isReady = true;
 };
 
 IOWA.CountdownTimer.Core.prototype.play = function(opt_skipIntro) {
   if (this.isPlaying) {
     return;
   }
 
   if (!this.isReady) {
     this.setUp(opt_skipIntro);
   }
 
   this.isPlaying = true;
   this.onFrame();
 };
 
 IOWA.CountdownTimer.Core.prototype.pause = function() {
   if (!this.isPlaying) {
     return;
   }
 
   this.isPlaying = false;
 };
 
 IOWA.CountdownTimer.Core.prototype.randomShape = function() {
   var found = this.randomIconStack.shift();
   this.randomIconStack.push(found);
   return found;
 };
 
 IOWA.CountdownTimer.Core.prototype.checkTime = function() {
   if (!this.showCurrentTime && (this.isCountdownComplete || (new Date()) >= this.targetDate)) {
     if (!this.isCountdownComplete) {
       this.isCountdownComplete = true;
       this.resetCanvas();
       this.containerDomElement.fire('countdown-complete');
     }
 
     this.shouldRandomize = true;
   }
 
   var nextValues = this.nextColumnValues(this.targetDate, new Date());
 
   // Only set aria-label once @ page load. Updating it every clock tick is
   // showing style recalcs in the timeline.
   if (this.firstRun) {
     var countdownDescription;
 
     if (this.showCurrentTime) {
       countdownDescription = nextValues.column1 + ':' +
                              nextValues.column2 + ':' +
                              nextValues.column3;
     } else {
       countdownDescription = nextValues.column1 + ' days, ' +
                              nextValues.column2 + ' hours, ' +
                              nextValues.column3 + ' minutes, ' +
                              nextValues.column4 + ' seconds until Google I/O';
     }
 
     this.containerDomElement.setAttribute('aria-label', countdownDescription);
     // Exposing distance as a bindable property. This is so we can bind it to
     // a hidden div to work around a bug in Chrome and VoiceOver
     this.containerDomElement.currentTime = countdownDescription;
 
     if (this.showCurrentTime) {
       // this.randomizeBands(this.bands.slice(this.bands.length - 2), 1000);
     }
   }
 
   if (this.isMobile && this.firstRun) {
     this.bands[0].renderFlat();
     this.bands[1].renderFlat();
     this.bands[2].renderFlat();
     this.bands[3].renderFlat();
     this.bands[4].renderFlat();
     this.bands[5].renderFlat();
     // this.bands[6].renderFlat();
     // this.bands[7].renderFlat();
     // reset default band used in logo
     var d = nextValues.column3 % 10;
     this.bands[5].oldShape = d;
     this.bands[5].currentShape = d;
     this.firstRun = false;
   }
 
   if (this.shouldRandomize || this.currentlyRandomizing) {
     if (!this.currentlyRandomizing) {
       this.startRandomizing();
     }
   } else {
     if (this.firstRun || this.lastNumbers.column1 !== nextValues.column1) {
       this.bands[0].changeShape(Math.floor(nextValues.column1 / 10));
       this.bands[1].changeShape(nextValues.column1 % 10);
     }
 
     if (this.firstRun || this.lastNumbers.column2 !== nextValues.column2) {
       this.bands[2].changeShape(Math.floor(nextValues.column2 / 10));
       this.bands[3].changeShape(nextValues.column2 % 10);
     }
 
     if (this.firstRun || this.lastNumbers.column3 !== nextValues.column3) {
       this.bands[4].changeShape(Math.floor(nextValues.column3 / 10));
       this.bands[5].changeShape(nextValues.column3 % 10);
     }
 
     if (this.firstRun || this.lastNumbers.column4 !== nextValues.column4) {
       if (!this.showCurrentTime) {
         // this.bands[6].changeShape(Math.floor(nextValues.column4 / 10));
         // this.bands[7].changeShape(nextValues.column4 % 10);
       }
     }
 
     this.lastNumbers = nextValues;
     this.firstRun = false;
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.startRandomizing = function() {
//    this.shouldRandomize = false;
//    this.currentlyRandomizing = true;
//    this.randomizeBands(this.bands, 200);
 };
 
 IOWA.CountdownTimer.Core.prototype.randomizeBands = function(bands, delay) {
   bands.forEach(function(band) {
     band.changeShape(this.randomShape(band.currentShape));
   }.bind(this));
 
   var setA = [];
   var setB = bands.slice(0);
 
   this.randomInterval = setInterval(function() {
     setTimeout(function() {
       if (setA.length <= 0) {
         setA = setB.slice(0);
       }
 
       var randomIndex = Math.ceil(Math.random() * (setA.length - 1));
       var band = setA[randomIndex];
       setA.splice(randomIndex, 1);
       band.changeShape(this.randomShape(band.currentShape));
     }.bind(this), Math.random() * 200);
   }.bind(this), delay);
 };
 
 IOWA.CountdownTimer.Core.prototype.onFrame = function() {
   if (!this.isPlaying) {
     return;
   }
 
   if (this.needsCanvasReset) {
     this.resetCanvas();
   }
 
   if (this.intro) {
     this._onIntroFrame();
     requestAnimationFrame(this.onFrame);
     return;
   }
 
   if (this.mouseCoords) {
     this.handleMouseShudder();
   }
 
   this.checkTime();
 
   var i;
   // clear relevant canvas area
   var ctx = this.canvasElement.getContext('2d');
   ctx.save();
   ctx.scale(this.pixelRatio, this.pixelRatio);
 
   if (this.drawAll) {
     ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
   }
 
   ctx.restore();
 
   // add units
   if (!this.currentlyRandomizing && (!this.unitsAdded || this.drawAll)) {
     this.addUnits();
     this.unitsAdded = true;
   }
 
   // update bands
   for (i = 0; i < this.bands.length; i++) {
     this.bands[i].update();
   }
 
   // add separating slashes
   if (!this.currentlyRandomizing && this.format === 'horizontal') {
     this.addSeparators();
   }
 
   requestAnimationFrame(this.onFrame);
 };
 
 IOWA.CountdownTimer.Core.prototype._onIntroFrame = function() {
   if (!this.introRunning) {
     // Initialize intro.
     this.introRunning = true;
     this.intro.start();
     this.containerDomElement.fire('countdown-intro', {start: true});
   }
 
   var ctx = this.canvasElement.getContext('2d');
   ctx.save();
   ctx.scale(this.pixelRatio, this.pixelRatio);
   ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
   ctx.restore();
   var introFinished = this.intro.update();
 
   if (introFinished) {
     // Destroy intro.
     this.introRunning = false;
     this.intro = null;
     this.containerDomElement.fire('countdown-intro', {done: true});
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.nextColumnValues = function(target, now) {
   if (this.showCurrentTime) {
     var currentTime = new Date();
     return {
       column1: currentTime.getHours(),
       column2: currentTime.getMinutes(),
       column3: currentTime.getSeconds()
     };
   }
 
   var difference = (new Date(target - now)).getTime() / 1000;
 
   var secondsInMinutes = 60;
   var secondsInHours = (secondsInMinutes * 60);
   var secondsInDays = (secondsInHours * 24);
 
   var days = Math.floor(difference / secondsInDays);
   difference %= secondsInDays;
 
   var hours = Math.floor(difference / secondsInHours);
   difference %= secondsInHours;
 
   var minutes = Math.floor(difference / secondsInMinutes);
   difference %= secondsInMinutes;
 
   var seconds = Math.floor(difference);
 
   return {
     column1: days,
     column2: hours,
     column3: minutes,
     column4: seconds
   };
 };
 
 IOWA.CountdownTimer.Core.prototype.onMouseMove = function(e) {
   this.mouseCoords = {
     x: e.offsetX,
     y: e.offsetY
   };
 };
 
 IOWA.CountdownTimer.Core.prototype.handleMouseShudder = function() {
   var mouseX = this.mouseCoords.x;
   var mouseY = this.mouseCoords.y;
 
   for (var i = 0; i < this.bands.length; i++) {
     if (mouseX > (this.bands[i].center.x - this.bands[i].radius) &&
                   mouseX < (this.bands[i].center.x + this.bands[i].radius) &&
                   mouseY > (this.bands[i].center.y - this.bands[i].radius) &&
                   mouseY < (this.bands[i].center.y + this.bands[i].radius)) {
       this.bands[i].shudder(true);
     } else {
       this.bands[i].shudder(false);
     }
   }
 
   this.mouseCoords = null;
 };
 
 IOWA.CountdownTimer.Core.prototype.getFormat = function() {
   var stacked = this.containerDomElement.offsetWidth < IOWA.CountdownTimer.MOBILE_MAX_BREAKPOINT;
   this.format = stacked ? 'stacked' : 'horizontal';
 };
 
 IOWA.CountdownTimer.Core.prototype.setQuality = function(n) {
   this.quality = n;
 
   // Regenerate digit paths at new quality level.
   this.getDigits();
 
   for (var i = 0; i < this.bands.length; i++) {
     this.bands[i].setQuality(this.quality);
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.createBands = function() {
   var n = 6;
   var bands = [];
 
   var time = {
     digit_0: Math.floor(this.lastNumbers.column1 / 10),
     digit_1: this.lastNumbers.column1 % 10,
 
     digit_2: Math.floor(this.lastNumbers.column2 / 10),
     digit_3: this.lastNumbers.column2 % 10,
 
     digit_4: Math.floor(this.lastNumbers.column3 / 10),
     digit_5: this.lastNumbers.column3 % 10,
 
    //  digit_6: this.lastNumbers.column4 ? Math.floor(this.lastNumbers.column4 / 10) : 'android',
    //  digit_7: this.lastNumbers.column4 ? this.lastNumbers.column4 % 10 : 'infinity'
   };
 
   for (var i = 0; i < n; i++) {
     var defaultDigit = time['digit_' + i];
 
     if (defaultDigit < 0) {
       defaultDigit = 0;
     }
 
     bands.push(new IOWA.CountdownTimer.Band(
         this.canvasElement, this.quality, this, this.digits, defaultDigit));
   }
 
   return bands;
 };
 
 IOWA.CountdownTimer.Core.prototype.getBandCenter = function(n) {
   var x;
   var y;
   var w = this.containerDomElement.offsetWidth;
   var h = (this.format === 'horizontal') ? this.containerDomElement.offsetWidth / 2 : this.containerDomElement.offsetWidth;
   var offset;
   if (this.format === 'horizontal') {
     offset = Math.floor(n / 2);
     x = this.layout.x + this.layout.radius + this.layout.radius * 2 * n + (this.bandPadding * n) + offset * (this.bandGutter - this.bandPadding);
     y = this.layout.y + this.layout.radius;
   } else {
     offset = Math.floor(n / 2);
     x = this.layout.x + this.layout.radius + this.layout.radius * 2 * n + (this.bandPadding * n) + offset * (this.bandGutter - this.bandPadding);
     y = h / 2 - w / 4 + w / 24;
     offset = Math.floor(n / 4);
     if (offset > 0) {
       y = h / 2 + w / 4 - w / 24;
       x -= w - this.countdownMargin * 2 + this.bandGutter;
     }
   }
   return {x: x, y: y};
 };
 
 IOWA.CountdownTimer.Core.prototype.addUnits = function() {
   var offset = (this.format === 'horizontal') ? 42 : 32;
   var ctx = this.canvasElement.getContext('2d');
   ctx.save();
   ctx.scale(this.pixelRatio, this.pixelRatio);
   ctx.font = '500 12px Roboto';
   ctx.fillStyle = '#000000'; // blue grey 400
   ctx.textAlign = 'center';
 
   if (this.showCurrentTime) {
     ctx.fillText('', this.bands[0].center.x + this.layout.radius + this.bandPadding / 2, this.bands[0].center.y + this.layout.radius + offset);
     ctx.fillText('', this.bands[2].center.x + this.layout.radius + this.bandPadding / 2, this.bands[2].center.y + this.layout.radius + offset);
     ctx.fillText('', this.bands[4].center.x + this.layout.radius + this.bandPadding / 2, this.bands[4].center.y + this.layout.radius + offset);
   } else {
     ctx.fillText('Days', this.bands[0].center.x + this.layout.radius + this.bandPadding / 2, this.bands[0].center.y + this.layout.radius + offset);
     ctx.fillText('Hours', this.bands[2].center.x + this.layout.radius + this.bandPadding / 2, this.bands[2].center.y + this.layout.radius + offset);
     ctx.fillText('Minutes', this.bands[4].center.x + this.layout.radius + this.bandPadding / 2, this.bands[4].center.y + this.layout.radius + offset);
     ctx.fillText('Seconds', this.bands[6].center.x + this.layout.radius + this.bandPadding / 2, this.bands[6].center.y + this.layout.radius + offset);
   }
 
   ctx.restore();
 };
 
 IOWA.CountdownTimer.Core.prototype.addSeparators = function() {
   var ctx = this.canvasElement.getContext('2d');
 
   ctx.save();
   ctx.scale(this.pixelRatio, this.pixelRatio);
 
   if (this.showCurrentTime) {
     ctx.fillStyle = '#000000';
     for (var i = 0; i < this.colonSeparators.length; i++) {
       ctx.clearRect(this.colonSeparators[i].x - this.colonSeparators[i].radius - 2, this.colonSeparators[i].y - this.colonSeparators[i].radius - 2, (this.colonSeparators[i].radius * 2) + 4, (this.colonSeparators[i].radius * 2) + 4);
       ctx.beginPath();
       ctx.arc(this.colonSeparators[i].x, this.colonSeparators[i].y, this.colonSeparators[i].radius, 0, Math.PI * 2);
       ctx.fill();
     }
   } else {
     ctx.strokeStyle = '#000000';
     for (var j = 0; j < this.commaSeparators.length; j++) {
       ctx.clearRect(this.commaSeparators[j].x - 2, this.commaSeparators[j].y - 2, this.commaSeparators[j].w + 4, this.commaSeparators[j].h + 4);
       ctx.beginPath();
       ctx.moveTo(this.commaSeparators[j].x, this.commaSeparators[j].y);
       ctx.lineTo(this.commaSeparators[j].x + this.commaSeparators[j].w, this.commaSeparators[j].y + this.commaSeparators[j].h);
       ctx.lineWidth = this.strokeWeight;
       ctx.stroke();
     }
   }
 
   ctx.restore();
 };
 
 IOWA.CountdownTimer.Core.prototype.getSeparators = function() {
   this.commaSeparators = [];
   this.colonSeparators = [];
 
   for (var i = 1; i <= 2; i++) {
     var x = this.bands[i * 2].center.x - this.layout.radius - (this.bandPadding + this.bandGutter) / 2;
     var y = this.bands[i * 2].center.y + this.layout.radius - this.bandGutter / 1.6;
     this.commaSeparators.push({x: x, y: y, w: this.bandGutter / 2, h: this.bandGutter / 1.8});
   }
 
   for (var j = 1; j <= 2; j++) {
     var colonX = Math.round(this.bands[j * 2].center.x - this.layout.radius - (this.bandGutter / 2));
     var y1 = Math.round(this.bands[j * 2].center.y - (this.layout.radius * 0.5));
     var y2 = Math.round(this.bands[j * 2].center.y + (this.layout.radius * 0.5));
     var radius = Math.round(this.bandGutter / 4);
     this.colonSeparators.push({x: colonX, y: y1, radius: radius});
     this.colonSeparators.push({x: colonX, y: y2, radius: radius});
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.getDigits = function() {
   // read path information for the digits from an inline svg
   for (var i = 0; i < 10; i++) {
     this.digits[i] = this.getPath('path-' + i);
   }
 };
 
 IOWA.CountdownTimer.Core.prototype.getPath = function(svgId) {
   var svgHeight = 132 / 2;
 
   var path = document.getElementById(svgId);
   var length = path.getTotalLength();
 
   var quality = this.quality;
   var points = [];
 
   for (var i = 0; i < quality; i++) {
     var distance = i * length / quality;
     var point = path.getPointAtLength(distance);
     points.push({x: (point.x - svgHeight) / svgHeight, y: (point.y - svgHeight) / svgHeight});
   }
 
   return {
     points: points
   };
 };
 
 IOWA.CountdownTimer.Core.prototype.getLayout = function() {
   var canvasW = this.containerDomElement.offsetWidth;
   var canvasH = (this.format === 'horizontal') ? this.containerDomElement.offsetWidth / 2 : this.containerDomElement.offsetWidth;
 
   // set spacing variables
   if (canvasW < IOWA.CountdownTimer.MOBILE_BREAKPOINT) {
     this.countdownMargin = 14;
     this.bandGutter = 16;
     this.bandPadding = 4;
   } else if (canvasW < IOWA.CountdownTimer.MOBILE_MAX_BREAKPOINT) {
     this.countdownMargin = 14;
     this.bandGutter = 16;
     this.bandPadding = 4;
   } else if (canvasW < IOWA.CountdownTimer.TABLET_BREAKPOINT) {
     this.countdownMargin = 40;
     this.bandGutter = 16;
     this.bandPadding = 4;
   } else if (canvasW < this.maxWidth) {
     this.countdownMargin = 4;
     this.bandGutter = 16;
     this.bandPadding = 4;
   } else if (canvasW > this.maxWidth) {
     this.countdownMargin = Math.round((canvasW - this.maxWidth) / 2);
     this.bandGutter = 32;
     this.bandPadding = 8;
   }
 
   // set stroke weight
   if (canvasW < IOWA.CountdownTimer.MOBILE_BREAKPOINT) {
     this.strokeWeight = 2.5;
   } else if (canvasW < IOWA.CountdownTimer.MOBILE_MAX_BREAKPOINT) {
     this.strokeWeight = 3.0;
   } else if (canvasW < IOWA.CountdownTimer.TABLET_BREAKPOINT) {
     this.strokeWeight = 2.5;
   } else if (canvasW < IOWA.CountdownTimer.DESKTOP_BREAKPOINT) {
     this.strokeWeight = 3.0;
   } else if (canvasW < IOWA.CountdownTimer.XLARGE_BREAKPOINT) {
     this.strokeWeight = 4;
   }
 
   var w = canvasW - this.countdownMargin * 2;
   var h = canvasH;
   var r = (w - this.bandGutter * 3 - this.bandPadding * 4) / 6 / 2;
   var x = this.countdownMargin;
   var y = h / 2 - r;
 
   if (this.format === 'horizontal') {
     y -= IOWA.CountdownTimer.CENTER_OFFSET;
   }
 
   if (this.format === 'stacked') {
     r = (w - this.bandGutter - this.bandPadding * 2) / 4 / 2;
   }
 
   this.layout = {
     x: x,
     y: y,
     radius: r
   };
 };
 
 IOWA.CountdownTimer.Core.prototype.onResize = function() {
   this.needsCanvasReset = true;
 };
 
 IOWA.CountdownTimer.Core.prototype.resetCanvas = function() {
   if (!this.drawAll) {
     var ctx = this.canvasElement.getContext('2d');
     ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
   }
 
   this.getFormat();
 
   this.setCanvasSize();
 
   this.getLayout();
   this.unitsAdded = false;
 
   for (var i = 0; i < this.bands.length; i++) {
     this.bands[i].radius = this.layout.radius;
     this.bands[i].center = this.getBandCenter(i);
     this.bands[i].redraw();
   }
 
   if (this.intro) {
     this.intro.radius = this.layout.radius;
     this.intro.center = this.format === 'horizontal' ?
         this.getBandCenter(1) : this.getBandCenter(5);
   }
 
   this.getSeparators();
 
   this.needsCanvasReset = false;
 };
 
 IOWA.CountdownTimer.Core.prototype.setCanvasSize = function() {
   this.canvasElement.width = this.containerDomElement.offsetWidth * this.pixelRatio;
   this.canvasElement.height = (this.format === 'horizontal') ? this.containerDomElement.offsetWidth / 2 * this.pixelRatio : this.containerDomElement.offsetWidth * this.pixelRatio;
 
   this.canvasElement.style.width = this.containerDomElement.offsetWidth + 'px';
   this.canvasElement.style.height = (this.format === 'horizontal') ? this.containerDomElement.offsetWidth / 2 + 'px' : this.containerDomElement.offsetWidth + 'px';
 };
 