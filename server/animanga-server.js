Works = new Mongo.Collection("works");
AnimeDetails = new Mongo.Collection("anime_details");
MangaDetails = new Mongo.Collection("manga_details");

Meteor.startup(function () {
    if (Works.find().count() === 0) {
        Meteor.call("initializeDB");
    }
});

Meteor.methods({
    initializeDB: function () {
        var result = HTTP.call("GET", "http://www.animenewsnetwork.com/encyclopedia/reports.xml", {
            params: {
                id: 155,
                nlist: "all"
            }
        });

        var works = xml2js.parseStringSync(result.content);
        works.report.item.forEach(function (entry) {
            Meteor.call("addWork", entry);
        });
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
        // TODO Persist work details
        var result = HTTP.call("GET", "http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
            params: {
                title: id,
            }
        });
        var details = xml2js.parseStringSync(result.content);
        return details;
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