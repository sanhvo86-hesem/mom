/* ============================================================
 * 2FA Enrollment QR Code (client-side, no external services)
 * ============================================================ */
function renderEnrollQR(otpauthUrl){
  try{
    var el = document.getElementById('enroll-qr');
    if(!el) return;
    otpauthUrl = (otpauthUrl || '').trim();
    if(!otpauthUrl){
      el.innerHTML = '';
      return;
    }

    // Build QR using qrcodegen
    var Qr = window.qrcodegen && window.qrcodegen.QrCode ? window.qrcodegen.QrCode : null;
    if(!Qr){
      el.innerHTML = '<div style="font-size:12px;color:var(--danger)">Không thể tạo QR (qrcodegen missing).</div>';
      return;
    }

    var qr = Qr.encodeText(otpauthUrl, Qr.Ecc.MEDIUM);

    // Render to CANVAS at integer scale to avoid blur (helps phone scanning)
    var border = 4;
    var size = qr.size;
    var view = size + border*2;

    var box = 240; // container size in px
    var scale = Math.floor(box / view);
    if(scale < 2) scale = 2; // keep readable
    var px = view * scale;

    var canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';
    canvas.style.imageRendering = 'pixelated';

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,px,px);
    ctx.fillStyle = '#000';

    for(var y=0;y<size;y++){
      for(var x=0;x<size;x++){
        if(qr.getModule(x,y)){
          ctx.fillRect((x+border)*scale, (y+border)*scale, scale, scale);
        }
      }
    }

    el.innerHTML = '';
    el.appendChild(canvas);

    // Make QR clickable on mobile (deep link)
    el.style.cursor = 'pointer';
    el.onclick = function(){
      try{ window.location.href = otpauthUrl; }catch(e){}
    };
  }catch(err){
    console.error('[QR] renderEnrollQR failed:', err);
    var el2 = document.getElementById('enroll-qr');
    if(el2) el2.innerHTML = '<div style="font-size:12px;color:var(--danger)">Không thể tạo QR. Vui lòng nhập secret thủ công.</div>';
  }
}


/* QR Code generator (byte-mode) for HESEM Portal.
 * Self-contained (no external CDN). Renders QR as SVG.
 */
(function(global){
  'use strict';
  function assert(cond, msg){ if(!cond) throw new Error(msg || 'assert'); }

  // --- GF(256) math for Reed-Solomon ---
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGf(){
    var x = 1;
    for(var i=0;i<255;i++){ GF_EXP[i]=x; GF_LOG[x]=i; x <<= 1; if(x & 0x100) x ^= 0x11D; }
    for(var j=255;j<512;j++) GF_EXP[j]=GF_EXP[j-255];
  })();
  function gfMul(a,b){ if(a===0 || b===0) return 0; return GF_EXP[GF_LOG[a] + GF_LOG[b]]; }

  function polyMul(p,q){
    var res = new Array(p.length + q.length - 1);
    for(var i=0;i<res.length;i++) res[i]=0;
    for(var i=0;i<p.length;i++) for(var j=0;j<q.length;j++) res[i+j] ^= gfMul(p[i], q[j]);
    return res;
  }

  function reedSolomonComputeDivisor(degree){
    assert(degree>=1 && degree<=255);
    var result = [1];
    for(var i=0;i<degree;i++) result = polyMul(result, [1, GF_EXP[i]]); // (x + Î±^i)
    return result; // length degree+1, leading coef 1
  }

  function reedSolomonComputeRemainder(data, divisor){
    var degree = divisor.length - 1;
    var result = new Array(degree);
    for(var i=0;i<degree;i++) result[i]=0;
    for(var i=0;i<data.length;i++){
      var factor = data[i] ^ result[0];
      // shift left by 1
      for(var j=0;j<degree-1;j++) result[j] = result[j+1];
      result[degree-1] = 0;
      for(var j=0;j<degree;j++) result[j] ^= gfMul(divisor[j+1], factor);
    }
    return result;
  }

  // RS block table (version 1..40, ECC L/M/Q/H). Each entry is triples:
  // [count, totalCodewordsPerBlock, dataCodewordsPerBlock, ...]
  var RS_BLOCK_TABLE = [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13], [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16], [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13], [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15], [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12], [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13], [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13], [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16], [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15], [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15], [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14], [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16], [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17], [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13], [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16], [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17], [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16], [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17], [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16], [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16], [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16], [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16], [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16], [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16], [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16], [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17], [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16], [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16], [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16], [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16], [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16], [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];

  // --- Bit buffer ---
  function BitBuffer(){ this.bits=[]; }
  BitBuffer.prototype.appendBits = function(val, len){ for(var i=len-1;i>=0;i--) this.bits.push((val>>>i)&1); };
  BitBuffer.prototype.appendBytes = function(bytes){ for(var i=0;i<bytes.length;i++) this.appendBits(bytes[i], 8); };
  BitBuffer.prototype.getBitLength = function(){ return this.bits.length; };
  BitBuffer.prototype.toBytes = function(){
    var outLen = Math.ceil(this.bits.length/8);
    var out = new Uint8Array(outLen);
    for(var i=0;i<this.bits.length;i++) out[i>>>3] |= this.bits[i] << (7 - (i & 7));
    return out;
  };

  // --- QR code class ---
  function QrCode(version, ecc){
    this.version = version;
    this.ecc = ecc;
    this.size = version*4 + 17;
    this.modules = new Array(this.size);
    this.isFunction = new Array(this.size);
    for(var y=0;y<this.size;y++){
      this.modules[y] = new Array(this.size);
      this.isFunction[y] = new Array(this.size);
      for(var x=0;x<this.size;x++){ this.modules[y][x]=false; this.isFunction[y][x]=false; }
    }
  }

  QrCode.Ecc = {
    LOW:      {ordinal:0, formatBits:1},  // L
    MEDIUM:   {ordinal:1, formatBits:0},  // M
    QUARTILE: {ordinal:2, formatBits:3},  // Q
    HIGH:     {ordinal:3, formatBits:2}   // H
  };

  function getRsEntry(ver, ecc){ return RS_BLOCK_TABLE[(ver-1)*4 + ecc.ordinal]; }
  function getNumDataCodewords(ver, ecc){ var e=getRsEntry(ver,ecc),sum=0; for(var i=0;i<e.length;i+=3) sum += e[i]*e[i+2]; return sum; }
  function getEccCodewordsPerBlock(ver, ecc){ var e=getRsEntry(ver,ecc); return e[1]-e[2]; }
  function getBlocks(ver, ecc){
    var e=getRsEntry(ver,ecc), blocks=[];
    for(var i=0;i<e.length;i+=3){ var count=e[i], total=e[i+1], data=e[i+2]; for(var k=0;k<count;k++) blocks.push({totalLen:total, dataLen:data}); }
    return blocks;
  }

  function getAlignmentPatternPositions(ver){
    if(ver===1) return [];
    var numAlign = Math.floor(ver/7) + 2;
    var step = (ver===32) ? 26 : Math.ceil((ver*4 + 17 - 13) / (numAlign - 1) / 2) * 2;
    var result=[6];
    for(var pos = ver*4 + 17 - 7; result.length < numAlign; pos -= step) result.splice(1,0,pos);
    return result;
  }

  QrCode.prototype.setFunctionModule = function(x,y,dark){ this.modules[y][x]=dark; this.isFunction[y][x]=true; };

  QrCode.prototype.drawFinderPattern = function(x,y){
    for(var dy=-1; dy<=7; dy++) for(var dx=-1; dx<=7; dx++){
      var xx=x+dx, yy=y+dy;
      if(0<=xx && xx<this.size && 0<=yy && yy<this.size){
        var dark = (0<=dx && dx<=6 && 0<=dy && dy<=6 && (dx===0||dx===6||dy===0||dy===6||(2<=dx&&dx<=4&&2<=dy&&dy<=4)));
        this.setFunctionModule(xx,yy,dark);
      }
    }
  };

  QrCode.prototype.drawAlignmentPattern = function(x,y){
    for(var dy=-2; dy<=2; dy++) for(var dx=-2; dx<=2; dx++)
      this.setFunctionModule(x+dx,y+dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  };

  // Format bits helper
  function getFormatBits(ecc, mask){
    var data = (ecc.formatBits<<3) | mask;
    var rem = data;
    for(var i=0;i<10;i++) rem = (rem<<1) ^ (((rem>>>9)&1) * 0x537);
    return (((data<<10) | (rem & 0x3FF)) ^ 0x5412) & 0x7FFF;
  }

  QrCode.prototype.drawFormatBits = function(mask){
    var bits = getFormatBits(this.ecc, mask);
    for(var i=0;i<15;i++){
      var bit = ((bits>>>i)&1)!==0;
      // 1st copy
      if(i<6) this.setFunctionModule(8,i,bit);
      else if(i<8) this.setFunctionModule(8,i+1,bit);
      else this.setFunctionModule(8,this.size-15+i,bit);
      // 2nd copy
      if(i<8) this.setFunctionModule(this.size-1-i,8,bit);
      else this.setFunctionModule(14-i,8,bit);
    }
    this.setFunctionModule(8,this.size-8,true);
  };

  QrCode.prototype.drawFunctionPatterns = function(){
    this.drawFinderPattern(0,0);
    this.drawFinderPattern(this.size-7,0);
    this.drawFinderPattern(0,this.size-7);

    // Timing
    for(var i=0;i<this.size;i++){
      if(!this.isFunction[6][i]) this.setFunctionModule(i,6,i%2===0);
      if(!this.isFunction[i][6]) this.setFunctionModule(6,i,i%2===0);
    }

    // Alignment
    var align=getAlignmentPatternPositions(this.version);
    for(var i=0;i<align.length;i++) for(var j=0;j<align.length;j++){
      var x=align[i], y=align[j];
      // Skip only the three alignment patterns that overlap the finder patterns.
      // IMPORTANT: Do NOT skip patterns just because the center lies on timing row/col (x==6 or y==6),
      // otherwise QR versions >= 7 will become unreadable for many scanners.
      if((x===6 && y===6) || (x===6 && y===this.size-7) || (x===this.size-7 && y===6)) continue;
      this.drawAlignmentPattern(x,y);
    }

    // Dark module
    this.setFunctionModule(8, this.size-8, true);

    // Version
    if(this.version>=7){
      var rem=this.version;
      for(var i=0;i<12;i++) rem=(rem<<1)^(((rem>>>11)&1)*0x1F25);
      var bits=(this.version<<12)|(rem&0xFFF);
      for(var i=0;i<18;i++){ var bit=((bits>>>i)&1)!==0; var a=this.size-11+(i%3); var b=Math.floor(i/3); this.setFunctionModule(a,b,bit); this.setFunctionModule(b,a,bit); }
    }

    // Reserve format info areas (will be overwritten after masking)
    this.drawFormatBits(0);
  };

  QrCode.prototype.getModule = function(x,y){ return this.modules[y][x]; };

  function drawCodewords(qr, codewords){
    var size=qr.size;
    var bitIndex=0;
    function getBit(){
      var byte = codewords[bitIndex>>>3];
      var bit = (byte >>> (7 - (bitIndex & 7))) & 1;
      bitIndex++;
      return bit;
    }
    var upward=true;
    for(var right=size-1; right>=1; right-=2){
      if(right===6) right--;
      for(var v=0; v<size; v++){
        var y = upward ? (size-1-v) : v;
        for(var j=0;j<2;j++){
          var x = right - j;
          if(qr.isFunction[y][x]) continue;
          qr.modules[y][x] = getBit()===1;
        }
      }
      upward=!upward;
    }
  }

  function applyMask(mask, qr){
    for(var y=0;y<qr.size;y++) for(var x=0;x<qr.size;x++) if(!qr.isFunction[y][x]){
      var invert=false;
      switch(mask){
        case 0: invert=((x+y)%2)===0; break;
        case 1: invert=(y%2)===0; break;
        case 2: invert=(x%3)===0; break;
        case 3: invert=((x+y)%3)===0; break;
        case 4: invert=((Math.floor(y/2)+Math.floor(x/3))%2)===0; break;
        case 5: invert=(((x*y)%2)+((x*y)%3))===0; break;
        case 6: invert=((((x*y)%2)+((x*y)%3))%2)===0; break;
        case 7: invert=((((x+y)%2)+((x*y)%3))%2)===0; break;
        default: throw new Error('bad mask');
      }
      if(invert) qr.modules[y][x] = !qr.modules[y][x];
    }
  }

  function penaltyScore(qr){
    var size=qr.size, m=qr.modules, score=0;
    // Rows runs
    for(var y=0;y<size;y++){ var runColor=m[y][0], runLen=1; for(var x=1;x<size;x++){ if(m[y][x]===runColor){ runLen++; if(runLen===5) score+=3; else if(runLen>5) score+=1; } else { runColor=m[y][x]; runLen=1; } } }
    // Col runs
    for(var x=0;x<size;x++){ var runColor=m[0][x], runLen=1; for(var y=1;y<size;y++){ if(m[y][x]===runColor){ runLen++; if(runLen===5) score+=3; else if(runLen>5) score+=1; } else { runColor=m[y][x]; runLen=1; } } }
    // 2x2
    for(var y=0;y<size-1;y++) for(var x=0;x<size-1;x++){ var c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) score+=3; }
    // Finder-like patterns
    function finderPenaltyLine(line){
      for(var i=0;i+10<line.length;i++){ 
        if(line[i] && !line[i+1] && line[i+2] && line[i+3] && line[i+4] && !line[i+5] && line[i+6] && !line[i+7] && !line[i+8] && !line[i+9] && !line[i+10]) score+=40;
        if(!line[i] && !line[i+1] && !line[i+2] && !line[i+3] && line[i+4] && !line[i+5] && line[i+6] && line[i+7] && line[i+8] && !line[i+9] && line[i+10]) score+=40;
      }
    }
    for(var y=0;y<size;y++) finderPenaltyLine(m[y]);
    for(var x=0;x<size;x++){ var col=new Array(size); for(var y=0;y<size;y++) col[y]=m[y][x]; finderPenaltyLine(col); }
    // Balance
    var dark=0; for(var y=0;y<size;y++) for(var x=0;x<size;x++) if(m[y][x]) dark++;
    var total=size*size;
    score += Math.floor(Math.abs(dark*100/total - 50)/5)*10;
    return score;
  }

  function cloneQr(qr){
    var out=new QrCode(qr.version, qr.ecc);
    for(var y=0;y<qr.size;y++) for(var x=0;x<qr.size;x++){ out.modules[y][x]=qr.modules[y][x]; out.isFunction[y][x]=qr.isFunction[y][x]; }
    return out;
  }

  QrCode.encodeText = function(text, ecc){
    var bytes;
    if(typeof TextEncoder !== 'undefined') bytes = new TextEncoder().encode(text);
    else { bytes=new Uint8Array(text.length); for(var i=0;i<text.length;i++) bytes[i]=text.charCodeAt(i)&0xFF; }
    return QrCode.encodeBinary(bytes, ecc);
  };

  QrCode.encodeBinary = function(bytes, ecc){
    var ver;
    for(ver=1; ver<=40; ver++){ 
      var capBits = getNumDataCodewords(ver, ecc)*8;
      var countBits = (ver<=9)?8:16;
      var usedBits = 4 + countBits + bytes.length*8;
      if(usedBits <= capBits) break;
    }
    if(ver>40) throw new Error('Data too long');

    var bb=new BitBuffer();
    bb.appendBits(0x4,4);
    bb.appendBits(bytes.length, (ver<=9)?8:16);
    bb.appendBytes(bytes);

    var capBits = getNumDataCodewords(ver, ecc)*8;
    var remaining = capBits - bb.getBitLength();
    bb.appendBits(0, Math.min(4, remaining));
    while(bb.getBitLength()%8!==0) bb.appendBits(0,1);

    var dataBytes = Array.prototype.slice.call(bb.toBytes());
    var capBytes = capBits/8;
    var pad=[0xEC,0x11], pi=0;
    while(dataBytes.length < capBytes){ dataBytes.push(pad[pi]); pi ^= 1; }

    var blocks = getBlocks(ver, ecc);
    var eccLen = getEccCodewordsPerBlock(ver, ecc);
    var rsDiv = reedSolomonComputeDivisor(eccLen);

    var blockData=[], k=0;
    for(var b=0;b<blocks.length;b++){ 
      var len=blocks[b].dataLen;
      var dat=dataBytes.slice(k,k+len); k+=len;
      var eccBytes = reedSolomonComputeRemainder(dat, rsDiv);
      blockData.push({data:dat, ecc:eccBytes});
    }

    var inter=[];
    var maxDataLen=0;
    for(var b=0;b<blockData.length;b++) if(blockData[b].data.length>maxDataLen) maxDataLen=blockData[b].data.length;
    for(var i=0;i<maxDataLen;i++) for(var b=0;b<blockData.length;b++) if(i<blockData[b].data.length) inter.push(blockData[b].data[i]);
    for(var i=0;i<eccLen;i++) for(var b=0;b<blockData.length;b++) inter.push(blockData[b].ecc[i]);

    var codewords = new Uint8Array(inter.length);
    for(var i=0;i<inter.length;i++) codewords[i]=inter[i];

    var base=new QrCode(ver,ecc);
    base.drawFunctionPatterns();
    drawCodewords(base, codewords);

    var best=null, bestScore=1e9, bestMask=0;
    for(var mask=0; mask<8; mask++){ 
      var test = cloneQr(base);
      applyMask(mask, test);
      test.drawFormatBits(mask);
      var sc=penaltyScore(test);
      if(sc<bestScore){ bestScore=sc; bestMask=mask; best=test; }
    }
    return best;
  };

  global.qrcodegen = {QrCode: QrCode};
})(typeof window!=='undefined'?window:globalThis);


