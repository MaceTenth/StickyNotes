var db = null;

if(window.openDatabase){
	db = openDatabase("NoteTest","1.0","Stickys Database",10000000);
	if(!db){
		alert("Failed to open database");
	}
} else {
	alert("Failed to open database, make sure your browser supports HTML5 web storage");
}

var captured = null;
var highestZ = 0;
var highestId = 0;


    
    
    


function Note(){
    var self = this;

    var note = document.createElement('div');
    
    note.className = 'note';
    note.addEventListener('mousedown', function(e) { return self.onMouseDown(e) }, false);
    note.addEventListener('click', function() { return self.onNoteClick() }, false);
    
    this.note = note;

    var close = document.createElement('div');
    close.className = 'closebutton';
    close.addEventListener('click', function(event) { return self.close(event) }, false);
    note.appendChild(close);

    var edit = document.createElement('div');
    edit.className = 'edit';
    edit.setAttribute('contenteditable', true);
    edit.addEventListener('keyup', function() { return self.onKeyUp() }, false);
    note.appendChild(edit);
    this.editField = edit;

    var ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.addEventListener('mousedown', function(e) { return self.onMouseDown(e) }, false);
    note.appendChild(ts);
    this.lastModified = ts;

    document.body.appendChild(note);
    return this;
}

Note.prototype = {
    get id(){
        if (!("_id" in this))
            this._id = 0;
        return this._id;
    },

    set id(x){
        this._id = x;
    },

    get text(){
        return this.editField.innerHTML;
    },

    set text(x){
        this.editField.innerHTML = x;
    },

    get timestamp(){
        if (!("_timestamp" in this))
            this._timestamp = 0;
        return this._timestamp;
    },

    set timestamp(x){
        if (this._timestamp == x)
            return;

        this._timestamp = x;
        var date = new Date();
        date.setTime(parseFloat(x));
        this.lastModified.textContent = modifiedString(date);
    },

    get left(){
        return this.note.style.left;
    },

    set left(x){
        this.note.style.left = x;
    },

    get top(){
        return this.note.style.top;
    },

    set top(x){
        this.note.style.top = x;
    },

    get zIndex(){
        return this.note.style.zIndex;
    },

    set zIndex(x){
        this.note.style.zIndex = x;
    },

    close: function(event){
        this.cancelPendingSave();
        var note = this;
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM MyStickys WHERE id = ?", [note.id]);
        });
        document.body.removeChild(this.note);
    },

    saveSoon: function(){
        this.cancelPendingSave();
        var self = this;
        this._saveTimer = setTimeout(function() { self.save() }, 200);
    },

    cancelPendingSave: function(){
        if (!("_saveTimer" in this))
            return;
        clearTimeout(this._saveTimer);
        delete this._saveTimer;
    },

    save: function(){
        this.cancelPendingSave();

        if ("dirty" in this) {
            this.timestamp = new Date().getTime();
            delete this.dirty;
        }

        var note = this;
        db.transaction(function (tx)
        {
            tx.executeSql("UPDATE MyStickys SET note = ?, timestamp = ?, left = ?, top = ?, zindex = ? WHERE id = ?", [note.text, note.timestamp, note.left, note.top, note.zIndex, note.id]);
        });
    },

    saveAsNew: function(){
        this.timestamp = new Date().getTime();
        
        var note = this;
        db.transaction(function (tx) {
            tx.executeSql("INSERT INTO MyStickys (id, note, timestamp, left, top, zindex) VALUES (?, ?, ?, ?, ?, ?)", [note.id, note.text, note.timestamp, note.left, note.top, note.zIndex]);
        }); 
    },

    onMouseDown: function(e){
        captured = this;
        this.startX = e.clientX - this.note.offsetLeft;
        this.startY = e.clientY - this.note.offsetTop;
        this.zIndex = ++highestZ;

        var self = this;
        if (!("mouseMoveHandler" in this)) {
            this.mouseMoveHandler = function(e) { return self.onMouseMove(e) }
            this.mouseUpHandler = function(e) { return self.onMouseUp(e) }
        }

        document.addEventListener('mousemove', this.mouseMoveHandler, true);
        document.addEventListener('mouseup', this.mouseUpHandler, true);

        return false;
    },

    onMouseMove: function(e){
        if (this != captured)
            return true;

        this.left = e.clientX - this.startX + 'px';
        this.top = e.clientY - this.startY + 'px';
        return false;
    },

    onMouseUp: function(e){
        document.removeEventListener('mousemove', this.mouseMoveHandler, true);
        document.removeEventListener('mouseup', this.mouseUpHandler, true);

        this.save();
        return false;
    },

    onNoteClick: function(e){
        this.editField.focus();
        getSelection().collapseToEnd();
    },

    onKeyUp: function(){
        this.dirty = true;
        this.saveSoon();
    },
}

function loaded(){
    db.transaction(function(tx) {
        tx.executeSql("SELECT COUNT(*) FROM MyStickys", [], function(result) {
            loadNotes();
        }, function(tx, error) {
            tx.executeSql("CREATE TABLE MyStickys (id REAL UNIQUE, note TEXT, timestamp REAL, left TEXT, top TEXT, zindex REAL)", [], function(result) { 
                loadNotes(); 
            });
        });
    });
}

function loadNotes(){
    db.transaction(function(tx) {
        tx.executeSql("SELECT id, note, timestamp, left, top, zindex FROM MyStickys", [], function(tx, result) {
            for (var i = 0; i < result.rows.length; ++i) {
                var row = result.rows.item(i);
                var note = new Note();
                note.id = row['id'];
                note.text = row['note'];
                note.timestamp = row['timestamp'];
                note.left = row['left'];
                note.top = row['top'];
                note.zIndex = row['zindex'];

                if (row['id'] > highestId)
                    highestId = row['id'];
                if (row['zindex'] > highestZ)
                    highestZ = row['zindex'];
            }

            if (!result.rows.length)
                newNote();
        }, function(tx, error) {
            alert('Failed to retrieve notes from database - ' + error.message);
            return;
        });
    });
}

function modifiedString(date){
    return 'Note Last Modified: ' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function newNote(){
    var note = new Note();
    note.id = ++highestId;
    note.timestamp = new Date().getTime();
    note.left = Math.round(Math.random() * 400) + 'px';
    note.top = Math.round(Math.random() * 500) + 'px';
   
    note.zIndex = ++highestZ;
    note.saveAsNew();
}


   
   
   
// var color1 = Math.round(Math.random() * 256);
// var color2 = Math.round(Math.random() * 256);
// var color3 = Math.round(Math.random() * 256);
// var bgColor = "rgb(" + color1 + "," + color2 + "," + color3 + ")";
// note.style.background = bgColor;


if (db != null)
    addEventListener('load', loaded, false);