Meteor.subscribe("allWorks");
Works = new Mongo.Collection("works");

Meteor.subscribe("allGenres");
Genres = new Mongo.Collection("genres");

Meteor.subscribe("allTypes");
Types = new Mongo.Collection("types");

Meteor.subscribe("allThemes");
Themes = new Mongo.Collection("themes");

Meteor.subscribe("allDetails");
WorkDetails = new Mongo.Collection("details");

Template.body.helpers({
    works: function () {
        return Works.find({});
    },
    genres: function () {
        return Genres.find({});
    },
    types: function () {
        return Types.find({});
    },
    themes: function () {
        return Themes.find({});
    },
    details: function() {
        //TODO Show details on screen
        return WorkDetails.find({});
    }
});
