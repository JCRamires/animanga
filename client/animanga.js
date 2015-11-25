Works = new Mongo.Collection('works')

Meteor.subscribe('allGenres')
Genres = new Mongo.Collection('genres')

Meteor.subscribe('allThemes')
Themes = new Mongo.Collection('themes')


var filteredWorksSubscribeHandle

Template.body.helpers({
    works: function () {
        return Works.find({}, {sort: {name: 1}})
    }
})

Template.body.helpers({
    genres: function () {
        return Genres.find({}, {sort: {name: 1}})
    },
    themes: function () {
        return Themes.find({}, {sort: {name: 1}})
    }
})

Template.work.events({
    'click .workCard': function (event) {
        event.preventDefault()
    }
})

Template.menuNavbar.events({
    'change #filters': function () {
        Session.set('filters', $('#filters').serializeJSON())
    }
})

Template.menuNavbar.onRendered(function () {
    $('#genreSelect').selectize({
        valueField: 'name',
        labelField: 'name',
        searchField: 'name',
        load: function (query, callback) {
            var genres = Genres.find({})
            callback(genres.fetch())
        }
    })

    $('#themeSelect').selectize({
        valueField: 'name',
        labelField: 'name',
        searchField: 'name',
        create: function (input) {
            return {
                value: input,
                text: input
            }
        },
        load: function (query, callback) {
            var themes = Themes.find({})
            callback(themes.fetch())
        }
    })
})

Tracker.autorun(function () {
    var filters = Session.get('filters')
    filteredWorksSubscribeHandle = Meteor.subscribeWithPagination('filteredWorks', filters, 20)

})

function loadMore() {
    var threshold, target = $('#showMoreResults')
    if (!target.length) return

    threshold = $(window).scrollTop() + $(window).height() - target.height()

    if (target.offset().top < threshold) {
        if (!target.data('visible')) {
            target.data('visible', true)
            filteredWorksSubscribeHandle.loadNextPage()
        }
    } else {
        if (target.data('visible')) {
            target.data('visible', false)
        }
    }

}

$(window).scroll(loadMore)
