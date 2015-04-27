Meteor.subscribe("allWorks");
Works = new Mongo.Collection("works")

Template.body.helpers({
    works: function () {
        return Works.find({}, {
            limit: 100
        });
    },
    workDetails: function (id) {
        Meteor.call("getWorkDetails", this.id, function (error, result) {
            if (error) {
                console.log(erro.reason);
            } else {
                console.log(result);
            }
        });
    }
});