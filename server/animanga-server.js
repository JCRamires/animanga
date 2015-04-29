Works = new Mongo.Collection("works");
AnimeDetails = new Mongo.Collection("anime_details");
MangaDetails = new Mongo.Collection("manga_details");
Genres = new Mongo.Collection("genres");
Genres._ensureIndex({name: 1}, {unique: 1});

Meteor.startup(function () {
    if (Works.find().count() === 0) {
        Meteor.call("initializeDB");
    }
});

Meteor.methods({
    initializeDB: function () {
        console.log("Fetching works");
        var result = HTTP.get("http://www.animenewsnetwork.com/encyclopedia/reports.xml", {
            params: {
                id: 155
                // nlist: "all"
            }
        });

        var workIDs = [];
        var works = xml2js.parseStringSync(result.content);
        works.report.item.forEach(function (entry) {
            Meteor.call("addWork", entry);
            workIDs.push(parseInt(entry.id));
        });

        console.log("Fetching work details");
        Meteor.call("workDetailsBatch", workIDs);
    },
    addWork: function (entry) {
        Works.insert({
            id: entry.id,
            gid: entry.gid,
            name: entry.name,
            type: entry.type,
            vintage: entry.vintage
        })
    },
    addWorkDetails: function (entry) {
        //TODO get genre,themes and picture from entry.info
        //TODO get ratings from entry.ratings
    },
    getWorkDetails: function (id) {
        var result = HTTP.get("http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
            params: {
                title: id,
            }
        });
        var details = xml2js.parseStringSync(result.content);
        return details;
    },
    workDetailsBatch: function (workIDs) {
        var batchIDs = [];
        workIDs.forEach(function (id, index){
            if(batchIDs.length < 50){
                batchIDs.push(id);
            }
            if(batchIDs.length == 50 || index == workIDs.length){
                var appendIDs;
                batchIDs.forEach(function(id, index){
                    if(index == 0){
                        appendIDs = id;
                    } else {
                        appendIDs += "/" + id;
                    }
                });

                var result = HTTP.get("http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
                    query: "title="+appendIDs
                });

                var works = xml2js.parseStringSync(result.content);

                Object.keys(works.ann).forEach(function (key) {
                    works.ann[key].forEach(function (entry){

                    };
                });

                batchIDs = [];
            }
        });
    }
});

Meteor.publish("allWorks", function () {
    return Works.find({}, {
        sort: {
            name: 1
        }
    });
});
