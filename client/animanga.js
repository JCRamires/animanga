Works = new Mongo.Collection('works');

Meteor.subscribe('allGenres');
Genres = new Mongo.Collection('genres');

Meteor.subscribe('allThemes');
Themes = new Mongo.Collection('themes');


let filteredWorksSubscribeHandle;
const NUMBER_OF_RECORDS_TO_FETCH = 20;

Template.body.helpers({
    works(){
        return Works.find({}, {sort: {name: 1}});
    }
});

Template.body.helpers({
    genres(){
        return Genres.find({}, {sort: {name: 1}});
    },
    themes(){
        return Themes.find({}, {sort: {name: 1}});
    }
});

Template.work.events({
    'click .workCard': function (event) {
        event.preventDefault();
    }
});

Template.menuBar.events({
    'change #filters': function () {
        Session.set('filters', $('#filters').serializeJSON());
    }
});

Template.menuBar.onRendered(function () {
    $('#genreSelect').selectize({
        valueField: 'name',
        labelField: 'name',
        searchField: 'name',
        load(query, callback){
            let genres = Genres.find({});
            callback(genres.fetch());
        }
    });

    $('#themeSelect').selectize({
        valueField: 'name',
        labelField: 'name',
        searchField: 'name',
        create(input){
            return {
                value: input,
                text: input
            };
        },
        load(query, callback){
            let themes = Themes.find({});
            callback(themes.fetch());
        }
    });
});

Tracker.autorun(function () {
    const filters = Session.get('filters');
    filteredWorksSubscribeHandle = Meteor.subscribeWithPagination('filteredWorks', filters, NUMBER_OF_RECORDS_TO_FETCH);
});

$(function(){
    $('.main').visibility({
        once: false,
        observeChanges: true,
        onBottomVisible: function(){
            filteredWorksSubscribeHandle.loadNextPage();
        }
    });
});
