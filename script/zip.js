// ================= MosqCare v3.6 .eln 导出：零依赖 ZIP（STORE 无压缩） =================
// MCZIP.build(files) —— files: [{name, content(string)}] → Uint8Array（合法 ZIP，.eln=application/vnd.eln+zip）
var MCZIP = (function(){
  var CRC_TABLE = (function(){
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++){
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes){
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(str){
    return new TextEncoder().encode(str);
  }
  // DOS 日期时间（本地时间）
  function dosDT(d){
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return {time: time, date: date};
  }
  function build(files){
    var enc = new TextEncoder(), chunks = [], central = [], offset = 0, now = new Date(), dt = dosDT(now);
    files.forEach(function(f){
      var nameB = enc.encode(f.name), dataB = typeof f.content === 'string' ? utf8(f.content) : f.content;
      var crc = crc32(dataB);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);   // local file header
      lh.setUint16(4, 20, true);           // version needed
      lh.setUint16(6, 0x0800, true);       // UTF-8 flag
      lh.setUint16(8, 0, true);            // method STORE
      lh.setUint16(10, dt.time, true);
      lh.setUint16(12, dt.date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, dataB.length, true);
      lh.setUint32(22, dataB.length, true);
      lh.setUint16(26, nameB.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), nameB, dataB);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);   // central directory
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dt.time, true);
      ch.setUint16(14, dt.date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, dataB.length, true);
      ch.setUint32(24, dataB.length, true);
      ch.setUint16(28, nameB.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + dataB.length;
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function(u){ cdSize += u.length; });
    var eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, files.length, true);
    eocd.setUint16(10, files.length, true);
    eocd.setUint32(12, cdSize, true);
    eocd.setUint32(16, cdStart, true);
    var all = chunks.concat(central, [new Uint8Array(eocd.buffer)]);
    var total = 0; all.forEach(function(u){ total += u.length; });
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function(u){ out.set(u, pos); pos += u.length; });
    return out;
  }
  function download(name, files){
    var bytes = build(files);
    var blob = new Blob([bytes], {type: 'application/vnd.eln+zip'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 200);
  }
  return {build: build, download: download, crc32: crc32};
})();
