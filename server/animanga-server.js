Works = new Mongo.Collection("works");
WorkDetails = new Mongo.Collection("workDetails");
Genres = new Mongo.Collection("genres");
Genres._ensureIndex({name: 1}, {unique: 1});
Types = new Mongo.Collection("types");
Types._ensureIndex({name: 1}, {unique: 1});
Themes = new Mongo.Collection("themes");
Themes._ensureIndex({name: 1}, {unique: 1});

Meteor.startup(function () {
    Works.remove({});
    WorkDetails.remove({});
    Genres.remove({});
    Types.remove({});

    if (Works.find().count() === 0) {
        Meteor.call("initializeDB");
    }
});

Meteor.methods({
    initializeDB: function () {
        console.log("Fetching works");
        var result = HTTP.get("http://www.animenewsnetwork.com/encyclopedia/reports.xml", {
            params: {
                id: 155,
                nlist: 100, //or "all"
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
    addWorkDetails: function (work) {
        Meteor.call("addTypeFromWork", work);
        Meteor.call("addGenresAndThemesFromWork", work);
        //TODO get ratings from entry.ratings
    },
    addTypeFromWork: function (work) {
        if(Types.findOne({name:work.$.type}) == undefined){
            Types.insert({
                name: work.$.type
            });
        }
    },
    addGenresAndThemesFromWork: function (work) {
        var workDetails = {id:work.$.id, genres:[], themes:[]};
        var workInfo = work["info"];
        Object.keys(workInfo).forEach(function (key){
            var workfInfoType = workInfo[key].$.type;
            var workInfoValue = workInfo[key]._;
            if(workfInfoType.toLowerCase() == "genres"){
                workDetails["genres"].push(workInfoValue);
                if(Genres.findOne({name:workInfoValue}) == undefined){
                    Genres.insert({
                        name: workInfoValue
                    });
                }
            } else if (workfInfoType.toLowerCase() == "themes"){
                workDetails["themes"].push(workInfoValue);
                if(Themes.findOne({name:workInfoValue}) == undefined){
                    Themes.insert({
                        name: workInfoValue
                    });
                }
            } else if (workfInfoType.toLowerCase() == "main title"){
                workDetails["name"] = workInfoValue;
            } else if (workfInfoType.toLowerCase() == "plot summary"){
                workDetails["plot"] = workInfoValue;
            } else if (workfInfoType.toLowerCase() == "objectionable content"){
                workDetails["mature"] = true;
            }
        });

        Meteor.call("persistWorkDetails", workDetails);
    },
    persistWorkDetails: function(work){
        if(WorkDetails.findOne({id:work.id}) == undefined){
            WorkDetails.insert(work);
        } else {
            WorkDetails.update({id:work.id}, work);
        }
    },
    getWorkDetails: function (id) {
        // var result = HTTP.get("http://cdn.animenewsnetwork.com/encyclopedia/api.xml", {
        //     params: {
        //         title: id,
        //     }
        // });
        // var details = xml2js.parseStringSync(result.content);
        // return details;

        return WorkDetails.findOne({id:id});
    },
    workDetailsBatch: function (workIDs) {
        var batchIDs = [];
        workIDs.forEach(function (id, index){
            if(batchIDs.length < 50){
                batchIDs.push(id);
            }
            if(batchIDs.length == 50 || index+1 == workIDs.length){
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
                        works.ann[key].forEach(function (work){
                            Meteor.call("addWorkDetails", work);
                        });
                    }
                );

                batchIDs = [];
            }
        });
    }
});

Meteor.publish("allWorks", function () {
    return Works.find({});
});

Meteor.publish("allGenres", function(){
    return Genres.find({});
});

Meteor.publish("allTypes", function() {
    return Types.find({});
});

Meteor.publish("allThemes", function(){
    return Themes.find({});
});

//TODO REMOVE THIS
Meteor.publish("allDetails"), function(){
    return WorkDetails.find({});
}
