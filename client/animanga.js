Works = new Mongo.Collection("works");

Meteor.subscribe("allGenres");
Genres = new Mongo.Collection("genres");

Meteor.subscribe("allTypes");
Types = new Mongo.Collection("types");

Meteor.subscribe("allThemes");
Themes = new Mongo.Collection("themes");

Template.filterForm.helpers({
    types: function () {
        return Types.find({});
    },
    genres: function () {
        return Genres.find({});
    },
    themes: function () {
        return Themes.find({});
    }
});

Template.filterForm.events({
    "change #filters": function (event){
        Session.set("filters",$("#filters").serializeJSON());
    }
});

Template.theme.onRendered(function () {
    $("#themeSelect").selectize({
        valueField: "name",
        labelField: "name",
        searchField: "name",
        create: function (input) {
            return {
                value: input,
                text: input
            }
        },
        load: function (query, callback) {
            var themes = Themes.find({});
            callback(themes.fetch());
        }
    });
});

Tracker.autorun(function(){
    var filters = Session.get("filters");
    Meteor.subscribe("filteredWorks", filters);
});