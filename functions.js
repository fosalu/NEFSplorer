/*Copyright (C) 2024 Fournelle Sam

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE X CONSORTIUM BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Except as contained in this notice, the name of Fournelle Sam shall not be used in advertising or otherwise to promote the sale,
use or other dealings in this Software without prior written authorization from Fournelle Sam.*/

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}

var filesystemdata = [];
var currentdirectory = "/";
const abortController = new AbortController();
abortController.signal.onabort = event => {
  //read aborted
};

//read from tag
scanButton.addEventListener("click", async () => {
try {
  const ndef = new NDEFReader();
  await ndef.scan({signal: abortController.signal});
  document.getElementById("circlep").innerHTML = '<p id="infop"><b>• Scan started •<br><br>Please introduce NFC device to phone...</b><br><i>(Scanning may take a while)</i></p>';
  document.getElementById("circlep").style = "margin-top: 90%";
  document.getElementById("scanButton").style.display = "none";
  document.getElementById("newfilesystembutton").style.display = "none";
  document.getElementById("circle1").removeAttribute("hidden");
  document.getElementById("circle2").removeAttribute("hidden");
  document.getElementById("circle3").removeAttribute("hidden");
  ndef.addEventListener("reading", ({ message, serialNumber }) => {
    filesystemdata = ndefmessagetodata(message);
    document.body.innerHTML = '<div id="fileviewer"></div>';
    generatefileviewer();
  });
} catch (error) {
  window.alert('An error occured while trying to scan!\n\n• Make sure you are on Chrome for Android\n• Make sure you are using HTTPS\n\nExact error: "' + error + '"');
}
});

function addwriteevent(){//write button
writeButton.addEventListener("click", async () => {
  document.body.innerHTML = '<div class="circles"><div class="circle1" id="circle1"></div><div class="circle2" id="circle2"></div><div class="circle3" id="circle3"></div><p id="circlep"><b>• Writing started •<br><br>Please introduce NFC device to phone...</b><br>(Writing may take a while)<br><br><b><i>Note: </b>Writing data to a NFC device may overwrite<br>all existing NDEF data on the device!</p></div>';
  document.getElementById("circlep").style = "margin-top: 95%";
  document.getElementById("circle1").style = "margin-top: -85%";
  document.getElementById("circle2").style = "margin-top: -85%";
  document.getElementById("circle3").style = "margin-top: -85%";
  abortController.abort();
  let NDEFarray = filesystemdatatoNDEF();
  let toBeWritten = {records: []};
  let message = [];
  try {
    const ndef = new NDEFReader();
    NDEFarray.forEach((entry, i) => {
      if (entry.slice(0, 5) == "cont:") {//see if entry is base64 data by checking "cont:" header
        entry = base64ToArrayBuffer(entry.substring(5));
        message = {recordType: "unknown", data: entry};
      }else{
        message = {recordType: "text", data: entry, lang: "\0"}; //added explicit NULL character to lang tag
      }
      toBeWritten.records.push(message);
    });
    await ndef.write(toBeWritten);
    window.alert('• Filesystem successfully written to NFC device');
    document.body.innerHTML = '<div id="fileviewer"></div>';
    generatefileviewer();
  } catch (error) {
    window.alert('An error occured while trying to write to NFC device!\n\n• There might not be enough storage space on the NFC device\n• The NFC device might have been removed to early\n\nExact error: "' + error + '"');
  }
});
}

function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function getFileType(filename){
  if ((filename.slice(-3).toUpperCase() == "JPG") || (filename.slice(-3).toUpperCase() == "PNG") || (filename.slice(-3).toUpperCase() == "GIF")) {
    return "imgfilename";
  }else if ((filename.slice(-3).toUpperCase() == "MP3") || (filename.slice(-3).toUpperCase() == "WAV") || (filename.slice(-3).toUpperCase() == "OGG")){
    return "audiofilename";
  }else if (filename.slice(-3).toUpperCase() == "TXT"){
    return "textfilename";
  }else{
    return "unsupportedfilename";
  }
}

function ndefmessagetodata(message){
  filesystemdata = filesystemdata.sort();
  let output = "";
  let currentlyhandlingfiledata = false;
  let currentdata = "";
  let innefs = false;
  let currentpath = [""];
  let filesystemname = "";
  let data = [];
  message.records.forEach(function(record){
    if (innefs == true) { //only execute while currently reading inside file system
      if (currentlyhandlingfiledata == true) { //handling binary file data
        currentdata = "cont:" + btoa(String.fromCharCode.apply(null, new Uint8Array(record.data.buffer))); //getting arraybuffer from dataview object and converting it to base64
        currentlyhandlingfiledata = false;
        data[(data.length - 1)].push(currentdata);
      }else{ //only execute while NOT handling a file´s data
        const textDecoder = new TextDecoder(record.encoding);
        currentdata = textDecoder.decode(record.data);
        if (currentdata.charAt(0) == "f") { //filename entry
          let newsubarray = [currentpath.join("/") + "/" + currentdata.slice(1)];
          data.push(newsubarray);
          currentlyhandlingfiledata = true;
        }
        if (currentdata.charAt(0) == "d") { //directory start entry
          currentpath.push(currentdata.slice(1));
        }
        if (currentdata.charAt(0) == "e") { //directory end entry
          currentpath.pop();
        }
        if (currentdata == "NEFSend") { //root directory end entry
          innefs = false;
        }
      }
    }else {
      const textDecoder = new TextDecoder(record.encoding);
      currentdata = textDecoder.decode(record.data);
      if (currentdata.slice(0,4) == "NEFS") { //root directory entry
        innefs = true;
        filesystemname = currentdata.slice(4);
        data.push(filesystemname);
      }
    }
  });
  return data;
}

function generatefileviewer(){ //generates the filexplorerdiv
  let filesystemname = "";
  let filename = "";
  let filedata = "";
  let patharray = [];
  let path = "";
  let directoryname = "";
  let directoryarray = [];
  let previousdirectoryname = "";
  let currentpatharray = [];
  let previouspath = "";
  let tableoutput = "";
  let filesystemexists = true;
  sortfilesystemdata();
    currentpatharray = currentdirectory.split("/");
    currentpatharray.pop();
    previouspath = currentpatharray.join("/");
    filesystemdata.forEach((file, i) => {
    if (i == 0) { //file systemname handling
      filesystemname = file;
      if (filesystemname == undefined) {
        filesystemexists = false;
      }
      document.getElementById('fileviewer').innerHTML = file + ': <i><b>"' + currentdirectory + '"<br><br><br></i></b>';
      if (previouspath == "") {previouspath = "/";} //corrects root directory
      if (currentdirectory != "/") { //generates back button if not in root directory
        document.getElementById('fileviewer').innerHTML += '<button id="' + previouspath + 'back" class="backbutton" onclick="jumptodirectory()"><- Back</button>';
      }else{
        document.getElementById('fileviewer').innerHTML += '<button disabled><- Back</button>';
      }
      document.getElementById('fileviewer').innerHTML += '<button id="addfilebutton" onclick="generateaddfile()">+ Add File</button><button id="writeButton">Write to NFC device</button><button id="renamefilesystembutton" onclick="generaterenamefilesystem()">Rename file system</button><br><br>';
      tableoutput = '<table id="filetable">';
    }else{
      filedata = file[1];
      if (file[0].replace(/[^/]/g, "").length == 1) { //pathdata manipulation for root directory
        filename = file[0].slice(1);
        path = "/";
      }else{ //pathdata manipulation to get separate filename and filepath
        patharray = file[0].split("/");
        filename = patharray[patharray.length - 1];
        patharray.pop();
        path = patharray.join("/");
      }
      if (path == currentdirectory) { //file handling
        tableoutput += '<tr><td id="icontd">';
        let filetype = getFileType(filename);
        if (filetype == "textfilename") {
          tableoutput += '<img id="icon" src="text.png">';
        }else if (filetype == "imgfilename") {
          tableoutput += '<img id="icon" src="image.png">';
        }else if (filetype == "audiofilename") {
          tableoutput += '<img id="icon" src="audio.png">';
        }else {
          tableoutput += '<img id="icon" src="unsupported.png">';
        }
        tableoutput += '</td><td id="filenametd"><button id="' + filename + '" onclick="gotofilecontent()" class="filebutton">' + filename + '</button></td><td id="fileoperationstd"><button class="operationsbutton" id="' + file[0] + '" onclick="generatefileoperations()"><img src="dots.png" class="operationdots" id="' + file[0] + '"></button></td><input type="hidden" id="' + filename + 'data" value="' + filedata + '"></tr>';
      }else{ //directory handling
        if (currentdirectory == "/") {
          directoryname = path.substring(currentdirectory.length);
        }else{
          directoryname = path.substring(currentdirectory.length + 1);
        }
        directoryarray = directoryname.split("/");
        directoryname = directoryarray[0];
        if ((directoryname != previousdirectoryname) && path.includes("/" + directoryname) && directoryname != "") { //avoiding duplicate directories and avoid ghost directories
          tableoutput += '<tr><td id="icontd"><img id="icon" src="directory.png"></td><td id=filenametd><button id="' + directoryname + '" onclick="jumptodirectory()" class="filebutton">' + directoryname + '</button></td><td id="fileoperationstd"><button id="' + directoryname + 'directory" class="operationsbutton" onclick="generatefileoperations()"><img src="dots.png" class="operationdots" id="' + directoryname + 'directory"></button></td></tr>';
        }
        previousdirectoryname = directoryname;
      }
    }
  });
  if (filesystemdata.length <= 1) {
    tableoutput += '<tr><td id="emptyfstd"><i><b>Note:</b> The root directory is currently empty, let\'s <b>add a file</b>!</td></tr>';
  }
  tableoutput += "</table>";
  document.getElementById('fileviewer').innerHTML += tableoutput + '<br><p id="notep"><i><b>Note:</b> NEFSplorer does not support empty directories. A directory will automatically be created when a file is moved to it.</i></p>';
  addwriteevent();
  if (filesystemexists == false) {
    nofilesystemfound();
  }
}

function jumptodirectory(){ //enables jumping to certain directories
  let directoryname = event.target.id;
  let sliceddirectoryname = directoryname.slice(-4);
  if (sliceddirectoryname == "back") {
    currentdirectory = directoryname.slice(0,-4);
    generatefileviewer();
  }else if (currentdirectory == "/") {
    currentdirectory += directoryname;
    generatefileviewer();
  }else{
    currentdirectory += "/" + directoryname;
    generatefileviewer();
  }
}

function gotofilecontent(){ //checks which file has been clicked and excecutes the fitting function
  let filename = event.target.id;
  let filetype = getFileType(filename);
  let filedata = document.getElementById(filename + "data").value
  if (filetype == "textfilename") {
    generatetextviewer(filename, filedata);
  }else if (filetype == "imgfilename") {
    generateimageviewer(filename, filedata);
  }else if (filetype == "audiofilename") {
    generateaudioviewer(filename, filedata);
  }else {
    downloadfile(filename, filedata);
  }
}

function generatetextviewer(filename, filedata){ //generates the textviewer
  document.getElementById('fileviewer').innerHTML = '<button id="backtofileviewbutton" onclick="generatefileviewer()"><-  Back to explorer</button><h1>' + filename + '</h1><textarea disabled type="text" id="textinput">' + atob(filedata.substring(5)) + '</textarea><button class="operationsoptionbutton" id="savebutton" onclick="downloadfile(' + "'" + filename + "', " + "'" + filedata + "'" + ')">Save</button>';
}

function generateimageviewer(filename, filedata){ //generates the imgviewer
  document.getElementById('fileviewer').innerHTML = '<button id="backtofileviewbutton" onclick="generatefileviewer()"><-  Back to explorer</button><h1>' + filename + '</h1><img src="data:@file/' + filename.slice(-3).toLowerCase() + ';base64,' + filedata.substring(5) + '" id="imgdisplay"><button class="operationsoptionbutton" id="savebutton" onclick="downloadfile(' + "'" + filename + "', " + "'" + filedata + "'" + ')">Save</button>';
}

function generateaudioviewer(filename, filedata){ //generates the audioviewer
  var out = '<button id="backtofileviewbutton" onclick="generatefileviewer()"><-  Back to explorer</button><h1>' + filename + '</h1><audio controls="controls" autobuffer="autobuffer"><source src="data:audio/';
  if (filename.slice(-3).toLowerCase() == "mp3") { //special case for mp3 files, audio player expects string "MPEG"
    out = out + "mpeg";
  }else{
    out = out + filename.slice(-3).toLowerCase();
  }
  out = out + ';base64,' + filedata.substring(5) + '"></audio><button class="operationsoptionbutton" id="savebutton" onclick="downloadfile(' + "'" + filename + "', " + "'" + filedata + "'" + ')">Save</button>';
  document.getElementById('fileviewer').innerHTML = out;

}

function generatefileoperations(){
  let filename = event.target.id;
  if (filename.slice(-9) == "directory") {
    let directoryname = filename.slice(0, -9);
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + directoryname + '</h1><br><button class="operationsoptionbutton" onclick="deletedirectory()" id="' + directoryname + '">Delete</button><button class="operationsoptionbutton" id="' + directoryname + 'directory" onclick="generaterename()">Rename</button>';
  }else{
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + filename + '</h1><br><button class="operationsoptionbutton" onclick="deletefile()" id="' + filename + '">Delete</button><button class="operationsoptionbutton" id="' + filename + '" onclick="generaterename()">Rename</button>';
    document.getElementById('fileviewer').innerHTML += '<button onclick="generatemovefile()" id="' + filename + '" class="operationsoptionbutton">Move</button>';
  }
}

function deletefile(){
  let filename = event.target.id;
  filesystemdata.forEach((file, i) => {
    if (i != 0) {
      if (file[0] == filename) {
        filesystemdata.splice(i, 1);
        generatefileviewer();
      }
    }
  });
}

function deletedirectory(){
  let directoryname = event.target.id;
  filesystemdata.forEach((file, i) => {
    if (i != 0) {
      if (file[0].includes(directoryname)) {
        delete filesystemdata[i];
      }
    }
  });
  generatefileviewer();
}

function generaterename(){
  let filename = event.target.id;
  if (filename.slice(-9) == "directory") {
    let directoryname = filename.slice(0, -9);
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + directoryname + '</h1><br><input type="text" id="renamedirectory" class="renameinput"><button id="' + directoryname + '" onclick="renamedirectory()" class="renamesubmitbutton">Rename</button><p id="errorp"></p>';
  }else{
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + filename + '</h1><br><input type="text" id="renamefile" class="renameinput"><button id="' + filename + '" onclick="renamefile()" class="renamesubmitbutton">Rename</button><br><p id="errorp"></p>';
  }
}

function renamefile(){
  let rename = document.getElementById("renamefile").value;
  if (/^[\w,\s-]+\.[A-Za-z0-9]{3}$/.test(rename) || /^[\w,\s-]+\.[A-Za-z0-9]{4}$/.test(rename)) {
    let newpath = "";
    let filename = event.target.id;
    let patharray = filename.split("/");
    let filenameonly = patharray[patharray.length - 1];
    patharray.pop();
    let path = patharray.join("/");
    if (patharray.length == 1) {
      newpath = "/" + rename;
    }else{
      newpath = "/" + path + "/" + rename;
    };
    let filenameexists = false; //checking for duplicate filenames
    filesystemdata.forEach((file, i) => {
      if (file[0] == newpath) {
        filenameexists = true;
      }
    });
    if (filenameexists == true) {
      document.getElementById("errorp").innerHTML = "Filename already exists!";
    }else{
      filesystemdata.forEach((file, i) => {
        if (i != 0) {
          if (file[0] == filename) {
            filesystemdata[i][0] = filename.replace(filenameonly, rename);
            generatefileviewer();
          }
        }
      });
    }
  }else if(rename == ""){
    document.getElementById("errorp").innerHTML = "The file requires a name!";
  }else{
    document.getElementById("errorp").innerHTML = "Please enter a valid filename!";
  }
}

function renamedirectory(){
  let directoryname = event.target.id;
  let rename = document.getElementById("renamedirectory").value;
  filesystemdata.forEach((file, i) => {
    if (i != 0) {
      if (file[0].includes(directoryname)) {
        filesystemdata[i][0] = filesystemdata[i][0].replace(directoryname, rename);
      }
    }
  });
  generatefileviewer();
}

function generaterenamefilesystem(){
  document.getElementById('fileviewer').innerHTML = '<button onclick="generatefileviewer()" id="cancelbutton">Cancel</button><h1>Rename file system</h1><br><input type="text" id="renamefilesystem" class="renameinput"><button class="renamesubmitbutton" onclick="renamefilesystem()">Rename</button><br><p id="errorp"></p>';
}

function renamefilesystem(){
  let newfilesystemname = document.getElementById("renamefilesystem").value;
  newfilesystemname = newfilesystemname.replace(/[^a-zA-Z ]/g, "");
  if(newfilesystemname == ""){
    newfilesystemname = "NoName";
  }
  filesystemdata[0] = newfilesystemname;
  generatefileviewer();
}

function generatemovefile(){
  let filename = event.target.id;
  if (currentdirectory == "/") {
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + filename + '</h1><br><input type="text" id="movefile" class="moveinput" value="/"><button id="' + filename + '" onclick="movefile()" class="movesubmitbutton">Move</button><br><p id="errorp"></p>';
  }else{
    document.getElementById('fileviewer').innerHTML = '<button id="cancelbutton" onclick="generatefileviewer()">Cancel</button><h1>' + filename + '</h1><br><input type="text" id="movefile" class="moveinput" value="' + currentdirectory + '/"><button id="' + filename + '" onclick="movefile()" class="movesubmitbutton">Move</button><br><p id="errorp"></p>';
  }
}

function movefile(){
  let filename = event.target.id;
  let newpath = document.getElementById("movefile").value;
  if (/^[\w+\/]+$/.test(newpath) && newpath.substring(1,2) != "/" && newpath.substring(0, 1) == "/") {
    let newpathnoslash = "/";
    if (newpath.charAt(newpath.length-1) != "/") {
      newpathnoslash = newpath;
      newpath += "/";
    }else{
      newpathnoslash = newpath.slice(0, -1);
    }
    patharray = filename.split("/");
    filenameonly = patharray[patharray.length - 1];
    let filenameexists = false; //checking for duplicate filenames
    filesystemdata.forEach((file, i) => {
      if (file[0] == (newpath + filenameonly)) {
        filenameexists = true;
      }
    });
    if (filenameexists == true) {
      document.getElementById("errorp").innerHTML = "The file you are trying to move already exists in this location!";
    }else{
      filesystemdata.forEach((file, i) => {
        if (i != 0) {
          if (file[0] == filename) {
            filesystemdata[i][0] = filename.replace(currentdirectory, newpath).replace("//", "/"); //Avoiding issue where two / are placed in a path
            currentdirectory = newpathnoslash;
            generatefileviewer();
          }
        }
      });
    }
  }else{
  document.getElementById("errorp").innerHTML = "Please enter a valid path!<br><br><i>eg.: /Directory/Subdirectory/</i>";
  }
}

function generateaddfile(){
  document.getElementById('fileviewer').innerHTML = '<button onclick="generatefileviewer()" id="cancelbutton">Cancel</button><h1>+ Add File</h1><br><input type="file" id="addfileinput"><button class="addfilebutton" onclick="addfile()">Add File</button><br><p id="notep"><i><b>Note:</b> Your file will <b>NOT</b> be uploaded, but will be processed locally on your device. Processing may take a few seconds...</i></p>';
}

function addfile(){
  var reader = new FileReader();
  let file = document.getElementById("addfileinput").files[0];
  let filename = file.name;
  let filetype = getFileType(filename);
  let filedata = "";
  let filearray = [];
    reader.readAsDataURL(file);
    reader.onload = function(){
      filedata = reader.result;
      filename = filename.replace(".jpeg", ".jpg"); //change jpeg to jpg if required
      if (currentdirectory == "/") {
        filearray[0] = currentdirectory + filename;
      }else{
        filearray[0] = currentdirectory + "/" + filename;
      }
      filedata = filedata.replace('data:', '');
      filearray[1] = "cont:" + filedata.replace(/^.+,/, '');
      filesystemdata.push(filearray);
      generatefileviewer();
  }
}

function downloadfile(filename, filedata){
  var link = document.createElement("a");
  link.download = filename;
  link.href = "data:@file/plain;base64," + filedata.substring(5);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  delete link;
}

function generatenewfilesystem(){
  document.body.innerHTML = '<div id="fileviewer"></div>';
  document.getElementById('fileviewer').innerHTML = '<h1>Create a new file system</h1><br><input type="text" id="newfilesystem" class="newfilesysteminput"  placeholder="Filesystemname"><button class="createsubmitbutton" onclick="newfilesystem()">Create</button><br><p id="errorp"></p>';
}

function newfilesystem(){
  let newfilesystem = document.getElementById("newfilesystem").value;
  newfilesystem = newfilesystem.replace(/[^a-zA-Z ]/g, "");
  if(newfilesystem == ""){
    newfilesystem = "NoName";
  }
  filesystemdata = [newfilesystem];
  generatefileviewer();
}

function filesystemdatatoNDEF(){
  let NDEFarray = [];
  let filename = "";
  let patharray = "";
  let entrycounter = 0;
  let closingarray = [];
  filesystemdata.forEach((file, i) => {
    if (i == 0) {
      NDEFarray[0] = "NEFS" + file;
      entrycounter ++;
    }else{
      filename = file[0].substring(1);
      patharray = filename.split("/");
      filename = patharray[patharray.length - 1];
      patharray.pop();
      if (Array.isArray(patharray)) {
        patharray.forEach((directory, y) => {
          if (NDEFarray.includes("d" + directory)) {
            NDEFarray.forEach((entry, j) => {
              if (entry == ("d") + directory) {
                entrycounter = j;
                entrycounter ++;
              }
            });
          }else{
            NDEFarray.splice(entrycounter, 0, "d" + directory);
            entrycounter ++;
            closingarray.push("e" + directory);
          }
        });
      }
      NDEFarray.splice(entrycounter, 0, "f" + filename);
      entrycounter ++;
      NDEFarray.splice(entrycounter, 0, file[1]);
      entrycounter ++;
      if (closingarray.length != 0) {
        closingarray.reverse();
        NDEFarray = NDEFarray.slice(0, entrycounter).concat(closingarray, NDEFarray.slice(entrycounter));
      }
      entrycounter = NDEFarray.length;
      closingarray = [];
    }
  });
  NDEFarray.push("NEFSend");
  return NDEFarray;
}

function sortfilesystemdata(){
  let filesystemname = filesystemdata[0];
  filesystemdata.shift();
  filesystemdata = filesystemdata.sort();
  filesystemdata.unshift(filesystemname);
}

function checkduplicatefilenames(filename){
  let returnvalue = false;
  filesystemdata.forEach((file, i) => {
    if (file[0] == filename) {
      retrunvalue = true;
    }
  });
  return returnvalue;
}

function nofilesystemfound(){
  document.getElementById('fileviewer').innerHTML = '<p id="nofilesystemp">No file system was found on your NFC device, let\'s <b>create one</b>!</p><br><input type="text" id="newfilesystem" class="newfilesysteminput" placeholder="File system name"><button class="createsubmitbutton" onclick="newfilesystem()">Create</button><br><p id="errorp"></p>';
}

function checkbrowser(){
  if (!navigator.userAgent.match(/Android/i)){
    document.body.innerHTML = '<div id="wrongbrowserdiv"><b><i>NEFS</i>plorer</b> is only supported on <b>Chrome for Android</b>.<br><br>Please make sure you are using <b>the correct browser</b>!</div>';
  }
  console.log('Copyright (C) 2024 Fournelle Sam\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),\nto deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,\nand/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE X CONSORTIUM BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,\nTORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n\nExcept as contained in this notice, the name of Fournelle Sam shall not be used in advertising or otherwise to promote the sale,\nuse or other dealings in this Software without prior written authorization from Fournelle Sam.');
}
