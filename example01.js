var inquirer = require('inquirer');
var fuzzy = require('fuzzy');

inquirer.registerPrompt('checkbox-plus', require('./index'));

var colors = [{
    name: 'The red color',
    value: 'red',
    short: 'red',
    disabled: false,
    type: 'color'
}, {
    name: 'The blue color',
    value: 'blue',
    short: 'blue',
    disabled: true
}, {
    name: 'The green color',
    value: 'green',
    short: 'green',
    disabled: false
}, {
    name: 'The yellow color',
    value: 'yellow',
    short: 'yellow',
    disabled: false
}, {
    name: 'The black color',
    value: {
        name: 'black'
    },
    short: 'black',
    disabled: false
}, ];

var person = [
    {name: 'chenxing', type:'name'},
    {name: 'zhoujielun', type: 'name'},
]

var age = [
    {name:1,},
    {name:2,},
    {name:3,},
    {name:4,},
    {name:5,}
]

var i = 0;

inquirer.prompt([{
    type: 'checkbox-plus',
    name: 'colors',
    message: 'Enter colors',
    pageSize: 4,
    highlight: true,
    // searchable: true,
    enablebackspace: true,
    default: ['yellow', 'red', {name: 'black'}],
    footer: '按上下键移动',
    header: 'press space to select',
    searching: '正在努力搜索中',
    noresult: '没有找到任何结果',
    validate: function(answer) {

        if (answer.length == 0) {
            return 'You must choose at least one color.';
        }

        return true;

    },
    source: function(answersSoFar, input) {

        input = input || '';

        return new Promise(function(resolve) {

            var fuzzyResult = fuzzy.filter(input, colors, {
                extract: function(item) {
                    return item['name'];
                }
            });

            var data = fuzzyResult.map(function(element) {
                return element.original;
            });

            if (i === 0) {
                resolve(data);
                i++;
            } else {
                setTimeout(resolve, 500, data)
            }

        });

    },
    subsource : function(choice, type){
        if (type === 'color'){
            return Promise.resolve(person);
        }
        if (type === 'name'){
            return Promise.resolve(age)
        }
        return Promise.resolve([])
    }
}]).then(function(answers) {

    console.log(answers.colors);

}).catch(console.log)