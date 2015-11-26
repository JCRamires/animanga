Works = new Mongo.Collection('works')
Genres = new Mongo.Collection('genres')
Genres._ensureIndex({name: 1}, {unique: 1})
Types = new Mongo.Collection('types')
Types._ensureIndex({name: 1}, {unique: 1})
Themes = new Mongo.Collection('themes')
Themes._ensureIndex({name: 1}, {unique: 1})

var NUMBER_OF_WORKS_TO_FETCH_API = 50

Meteor.startup(function () {
    if (Works.find().count() === 0) {
        Meteor.call('initializeDB')
    }
})

Meteor.methods({
    initializeDB: function () {
        console.log('Fetching works')
        var result = HTTP.get('http://www.animenewsnetwork.com/encyclopedia/reports.xml', {
            params: {
                id: 155,
                nlist: 50 //or 'all'
            }
        })

        var workIDs = []
        var works = xml2js.parseStringSync(result.content)
        works.report.item.forEach(function (entry) {
            Meteor.call('addWork', entry)
            workIDs.push(parseInt(entry.id))
        })

        console.log('Fetching work details')
        Meteor.call('workDetailsBatch', workIDs)
    },
    addWork: function (entry) {
        var type = entry.type.toString()
        var workObj = {id: entry.id, gid: entry.gid, name: entry.name, type: entry.type, vintage: entry.vintage}
        switch (type) {
            case 'TV' || 'OAV' || 'ONA':
                workObj.series = true
                break
            case 'movie':
                workObj.movie = true
                break
            case 'manga':
                workObj.manga = true
                break
        }

        Works.insert(workObj)
    },
    addWorkDetails: function (work) {
        Meteor.call('addTypeFromWork', work)
        Meteor.call('addGenresAndThemesFromWork', work)
    },
    addTypeFromWork: function (work) {
        if (Types.findOne({name: work.$.type}) === undefined) {
            Types.insert({
                name: work.$.type
            })
        }
    },
    addGenresAndThemesFromWork: function (work) {
        var workDetails = {workId: work.$.id, genres: [], themes: []}
        var workInfo = work.info

        if (typeof workInfo === 'object') {
            Object.keys(workInfo).forEach(function (key) {
                var workfInfoType = workInfo[key].$.type
                var workInfoValue = workInfo[key]._

                switch (workfInfoType.toLowerCase()) {
                    case 'genres':
                        workDetails.genres.push(workInfoValue)
                        if (Genres.findOne({name: workInfoValue}) === undefined) {
                            Genres.insert({
                                name: workInfoValue
                            })
                        }
                        break
                    case 'themes':
                        workDetails.themes.push(workInfoValue)
                        if (Themes.findOne({name: workInfoValue.toLowerCase()}) === undefined) {
                            Themes.insert({
                                name: workInfoValue.toLowerCase()
                            })
                        }
                        break
                    case 'main title':
                        workDetails.name = workInfoValue
                        break
                    case 'plot summary':
                        workDetails.plot = workInfoValue
                        break
                    case 'objectionable content':
                        if (workInfoValue.toLowerCase() === 'ma') {
                            workDetails.mature = true
                        }
                        break
                    case 'picture':
                        var workImg = workInfo[key].img[1]
                        if (workImg !== undefined) {
                            workDetails.picture = workImg.$
                        } else {
                            if (workInfo[key].img[0] !== undefined) {
                                workDetails.picture = workInfo[key].img[0].$
                            }
                        }
                        break
                    case 'alternative title':
                        if (workInfo[key].$.lang.toLowerCase() === 'ja') {
                            workDetails.alternativeTitle = workInfoValue
                        }
                        break
                }
            })
        }

        if (!_.has(workDetails, 'picture')) {
            workDetails.picture = {src: '/default.jpg', temporary: true}
        }

        Meteor.call('persistWorkDetails', workDetails)
    },
    persistWorkDetails: function (work) {
        work.lastUpdate = new Date()
        Works.update({id: work.workId}, {$set: {workDetails: work}})
    },
    workDetailsBatch: function (workIDs) {
        var batchIDs = []
        workIDs.forEach(function (id, index) {
            if (batchIDs.length < NUMBER_OF_WORKS_TO_FETCH_API) {
                batchIDs.push(id)
            }
            if (batchIDs.length === NUMBER_OF_WORKS_TO_FETCH_API || index + 1 === workIDs.length) {
                var appendIDs
                batchIDs.forEach(function (id, index) {
                    if (index === 0) {
                        appendIDs = id
                    } else {
                        appendIDs += '/' + id
                    }
                })

                var result = HTTP.get('http://cdn.animenewsnetwork.com/encyclopedia/api.xml', {
                    query: 'title=' + appendIDs
                })

                var works = xml2js.parseStringSync(result.content)

                Object.keys(works.ann).forEach(function (key) {
                    works.ann[key].forEach(function (work) {
                        Meteor.call('addWorkDetails', work)
                    })
                })

                console.log('Fetched ' + (index + 1) + ' out of ' + workIDs.length)

                batchIDs = []
            }
        })
    },
    createWorkQueryObject: function (filters) {
        var queryObject = {}
        var $and = []

        if (filters.types !== undefined && filters.types !== '') {
            var types = {$in: []}
            filters.types.forEach(function (type) {
                switch (type) {
                    case 'series':
                        types.$in.push('TV')
                        types.$in.push('OAV')
                        types.$in.push('ONA')
                        break
                    case 'movies':
                        types.$in.push('movie')
                        break
                    case 'manga':
                        types.$in.push(type)
                        break
                }
            })

            queryObject.type = types
        }

        if (filters.genres !== undefined && filters.genres !== '') {
            filters.genres.forEach(function (genre) {
                var genreObj = {'workDetails.genres': genre}
                $and.push(genreObj)
            })
        }

        if (filters.themes !== undefined && filters.themes !== '') {
            filters.themes.forEach(function (theme) {
                var themeObj = {'workDetails.themes': theme}
                $and.push(themeObj)
            })
        }

        if (_.size($and) !== 0) {
            queryObject.$and = $and
        }

        return queryObject
    }
})

Meteor.publish('allGenres', function () {
    return Genres.find({}, {sort: {name: 1}})
})

Meteor.publish('allThemes', function () {
    return Themes.find({}, {sort: {name: 1}})
})

Meteor.publish('searchThemes', function (query) {
    var search = new RegExp('^' + query, 'i')
    return Themes.find({name: search}).sort({name: 1})
})

Meteor.publish('filteredWorks', function (filters, limit) {
    if (filters !== null) {
        if (filters.genres !== undefined && filters.genres !== '') {
            filters.genres = filters.genres.split(',')
        }

        if (filters.themes !== undefined && filters.themes !== '') {
            filters.themes = filters.themes.split(',')
        }

        var queryObject = Meteor.call('createWorkQueryObject', filters)

        if (_.isEmpty(queryObject)) {
            return []
        }

        return Works.find(queryObject, {sort: {name: 1}, limit: limit})
    }
})
