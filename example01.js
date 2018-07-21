var inquirer = require('inquirer');

inquirer.registerPrompt('checkbox-plus', require('./index'));

var Phone = [{
    name: 'XiaoMi',
    value: 'MI',
    short: 'MI',
    disabled: false,
    type: 'cellphone'
}, {
    name: 'Google',
    value: 'Google',
    short: 'Google',
    disabled: true,
    type: 'cellphone',
}, {
    name: 'HUAWEI',
    value: 'green',
    short: 'green',
    disabled: false,
    type: 'cellphone',
}, {
    name: 'iPhone',
    value: 'iPhone',
    short: 'iPhone',
    disabled: false,
    type: 'cellphone',
}];

var iPhone = [
    { name: 'iPhone 6s', type: 'name', disabled: true, },
    { name: 'iPhone 8 plus', type: 'name', disabled: true, },
    { name: 'iPhone X', type: 'name', disabled: true, },
]
var XiaoMi = [
    { name: 'MI note', type: 'name', },
    { name: 'MI plus', type: 'name', },
    { name: 'Mi 3', type: 'name' },
    { name: 'Mi 4', type: 'name' },
    { name: 'Mi 5', type: 'name' },
    { name: 'Mi 6', type: 'name' },
    { name: 'Mi 8', type: 'name', },
]

var MiNote = [
    { name: 'Mi note I', type: 'name' },
    { name: 'Mi note II' },
    { name: 'Mi note III' },
]

var Note = [
    { name: 1 },
    { name: 2 },
]

var MiPlus = [
    { name: 'Mi 3 plus' },
    { name: 'Mi 4 plus' },
    { name: 'Mi 5 plus' },
]

var i = 0;

inquirer.prompt([{
    type: 'checkbox-plus',
    name: 'phone',
    message: 'select cellphone?',
    pageSize: 4,
    highlight: true,
    default: ['iPhone', 'MI'],
    footer: 'move up/down to select',
    header: 'press space to select',
    searching: 'searching....',
    noresult: 'nothing..',
    validate: function (answer) {

        if (answer.length == 0) {
            return 'You must choose at least one phone.';
        }

        return true;

    },
    source: function (answersSoFar, input) {

        // input = input || '';

        return Promise.resolve(Phone)

    },
    subsource: function (choice, type) {
        if (choice.name === 'iPhone') {
            return Promise.resolve(iPhone);
        }
        if (choice.name === 'XiaoMi') {
            return Promise.resolve(XiaoMi);
        }
        if (choice.name === 'MI note') {
            return Promise.resolve(MiNote);
        }
        if (choice.name === 'MI plus') {
            return Promise.resolve(MiPlus);
        }
        if (choice.name === 'Mi note I') {
            return Promise.resolve(Note);
        }
        return Promise.resolve([])
    }
}]).then(function (answers) {

    console.log(answers.phone);

}).catch(console.log)