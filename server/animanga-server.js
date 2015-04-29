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
        var result = HTTP.call("GET", "http://www.animenewsnetwork.com/encyclopedia/reports.xml", {
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
    getWorkDetails: function (id) {
        var result = HTTP.call("GET", "http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
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
                        appendIDs += id;
                    } else {
                        appendIDs += "/" + id;
                    }
                });

                var result = HTTP.call("GET", "http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
                    params: {
                        title: batchIDs
                    }
                });

                var works = xml2js.parseStringSync(result.content);

                //TODO iterate over works

                batchIDs = [];
            }
        });
    }
});

Meteor.publish("allWorks", function () {
    return Works.find({}, {
        sort: {
            name: 1
        },
        limit: 100
    });
});
