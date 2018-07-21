var _ = require('lodash');
var chalk = require('chalk');
var cliCursor = require('cli-cursor');
var figures = require('figures');
var ansiEscapes = require('ansi-escapes');
var Base = require('inquirer/lib/prompts/base');
var Choices = require('inquirer/lib/objects/choices');
var observe = require('inquirer/lib/utils/events');
var Paginator = require('inquirer/lib/utils/paginator');

var {
    map,
    skip,
    share,
    filter,
    takeUntil,
} = require('rxjs/operators');

class InnerChoices extends Choices {
    constructor(choices, answers) {
        super(choices, answers)
        this.type = choices.length ? choices[0].type : void 0;
        super.forEach(choice => {
            choice.type = this.type;
        })
        this.realChoices.forEach(choice => {
            choice.type = this.type;
        })
    }

    setHead(head, pointer, heads) {
        super.forEach(choice => {
            choice.head = head;
            choice.heads = heads;
            choice.headPointer = pointer;
        })
    }

    setTail(pointer, choices) {
        var currentChoice = super.getChoice(pointer);
        currentChoice.tail = choices;
        choices.setHead(currentChoice, pointer, this);
    }

    hasHead(pointer) {
        var realChoiceExist = super.getChoice(pointer) || {};
        // if choice is disabled then get the choice[0].head
        return realChoiceExist.head ? realChoiceExist.head : this.choices[0].head;
    }
}

class CheckBoxPlus extends Base {

    constructor(questions, rl, answers) {
        super(questions, rl, answers);

        // Default value for the highlight option
        if (typeof this.opt.highlight == 'undefined') {
            this.opt.highlight = false;
        }

        // Default value for the searchable option
        if (typeof this.opt.searchable == 'undefined') {
            this.opt.searchable = false;
        }

        // Default value for the default option
        if (typeof this.opt.default == 'undefined') {
            this.opt.default = null;
        }

        // Doesn't have source option
        if (!this.opt.source) {
            this.throwParamError('source');
        }


        // Init
        this.pointer = 0;
        this.firstSourceLoading = true;
        this.choices = new InnerChoices([], answers);
        this.checkedChoices = [];
        this.value = [];
        this.lastQuery = null;
        this.searching = false;
        this.lastSourcePromise = null;
        this.default = this.opt.default;
        this.opt.default = null;
        this.paginator = new Paginator(this.screen);

        //extend
        this.firstRender = true;
        this.opt = _.defaults(_.clone(this.opt), {
            answer: val => val, // 对 应答部分进行扩展
            keypress: val => val, // 对 searchable 状态下 按键进行扩展 
        });
        var header = this.opt.header;
        var footer = this.opt.footer;
        var searching = this.opt.searching;
        var noresult = this.opt.noresult;
        if (header && !_.isString(header) && !_.isFunction(header)) {
            throw new Error('CheckBoxPlus Param head must be string/function');
        }
        if (footer && !_.isString(footer) && !_.isFunction(footer)) {
            throw new Error('CheckBoxPlus Param footer must be string/function');
        }
        if (header && !_.isString(header) && !_.isFunction(searching)) {
            throw new Error('CheckBoxPlus Param searching must be string/function');
        }
        if (footer && !_.isString(footer) && !_.isFunction(noresult)) {
            throw new Error('CheckBoxPlus Param noresult must be string/function');
        }
        this.opt.header = _.isFunction(header) ? header() : header;
        this.opt.footer = _.isFunction(footer) ? footer() : footer;
        this.opt.searching = _.isFunction(searching) ? searching() : searching;
        this.opt.noresult = _.isFunction(noresult) ? noresult() : noresult;
    }

    /**
     * @overwrite
     */
    _run(callback) {

        var self = this;

        this.done = callback;

        this.rl.input.setMaxListeners(20);

        this.executeSource().then(function (result) {

            var events = observe(self.rl)

            var validation = self.handleSubmitEvents(
                events.line.pipe(map(self.getCurrentValue.bind(self)))
            );

            validation.success.forEach(self.onEnd.bind(self));
            validation.error.forEach(self.onError.bind(self));

            events.normalizedUpKey
                .pipe(takeUntil(validation.success))
                .forEach(self.onUpKey.bind(self));
            events.normalizedDownKey
                .pipe(takeUntil(validation.success))
                .forEach(self.onDownKey.bind(self));
            events.spaceKey
                .pipe(takeUntil(validation.success))
                .forEach(self.onSpaceKey.bind(self));

            // If the search is enabled
            if (!self.opt.searchable) {

                events.numberKey
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onNumberKey.bind(self));
                events.aKey
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onAllKey.bind(self));
                events.iKey
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onInverseKey.bind(self));
                // extend 
                // H key events 
                events.keypress
                    .pipe(...self.hKey())
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onHKey.bind(self))

                // L key events 
                events.keypress
                    .pipe(...self.lKey())
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onLKey.bind(self))

                // gg key events 
                events.keypress
                    .pipe(...self.homeKey())
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onHomeKey.bind(self))

                // G key events 
                events.keypress
                    .pipe(...self.endKey())
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onEndKey.bind(self))

            } else {
                events.keypress
                    .pipe(takeUntil(validation.success))
                    .forEach(self.onKeypress.bind(self));
                // add
                self.opt.keypress(events, validation, self);
            }

            if (self.rl.line) {
                self.onKeypress();
            }

            // Init the prompt
            cliCursor.hide();
            self.render();
            self.firstRender = false;

        });

        return this;

    }

    renderChoices(choices, pointer) {

        var self = this;
        var output = '';
        var separatorOffset = 0;
        var highlight = this.opt.highlight;

        // Foreach choice
        choices.forEach(function (choice, index) {

            // Is a separator
            if (choice.type === 'separator') {

                separatorOffset++;
                output += ' ' + choice + '\n';
                return;

            }

            // Is the choice disabled
            if (choice.disabled) {

                separatorOffset++;
                output += ' - ' + choice.name;
                output += ' (' + (_.isString(choice.disabled) ? choice.disabled : 'Disabled') + ')';
                output += '\n';
                return;

            }

            // Is the current choice is the selected choice
            if (index - separatorOffset === pointer) {

                output += chalk.cyan(figures.pointer);
                output += self.getCheckboxFigure(choice.checked) + ' ';
                if (!highlight) {
                    output += choice.name;
                } else {
                    output += highlight && (_.isFunction(highlight) ? highlight(choice.name) : chalk.cyan(choice.name));
                }
            } else {

                output += ' ' + self.getCheckboxFigure(choice.checked) + ' ' + choice.name;

            }

            output += '\n';


        });

        return output.replace(/\n$/, '');

    }


    /**
     * Render the prompt
     * 
     * @overwrite 
     */
    render(error, enabledSubSource) {

        // Render question
        var message = this.getQuestion();
        var bottomContent = '';

        // Answered
        if (this.status === 'answered') {

            // add
            var selection = this.opt.answer(this.selection);

            selection = _.isArray(selection) ? selection.join(', ') : selection;

            message += chalk.cyan(selection);

            return this.screen.render(message, bottomContent);

        }

        // No search query is entered before

        // If the search is enabled
        if (this.opt.searchable && this.firstRender) {

            message += this.opt.header ?
                this.opt.header :
                (
                    '(Press ' +
                    chalk.cyan.bold('<space>') +
                    ' to select, ' +
                    'or type anything to filter the list)'
                );

        } else if (!this.opt.searchable && this.firstRender) {

            message +=
                '(Press ' +
                chalk.cyan.bold('<space>') +
                ' to select, ' +
                chalk.cyan.bold('<a>') +
                ' to toggle all, ' +
                chalk.cyan.bold('<i>') +
                ' to invert selection)';

        }


        // If the search is enabled
        if (this.opt.searchable) {

            // Print the current search query
            message += this.rl.line;

        }

        // Searching mode
        if (this.searching) {

            message += '\n  ' +
                (this.opt.searching ?
                    this.opt.searching :
                    chalk.cyan('Searching...'))

            // No choices
        } else if (!this.choices.length) {

            message += '\n  ' +
                (this.opt.noresult ?
                    this.opt.noresult :
                    chalk.yellow('No results...'))

            // Has choices
        } else {

            var choicesStr = this.renderChoices(this.choices, this.pointer);

            var indexPosition = this.choices.indexOf(
                this.choices.getChoice(this.pointer)
            );
            // add 
            var realChoiceStr = this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
            var changed = choicesStr !== realChoiceStr;
            if (changed) {
                choicesStr = _.slice(realChoiceStr.split('\n'), 0, -1)
                realChoiceStr = this.opt.footer ? choicesStr.join('\n') + '\n' + this.opt.footer : realChoiceStr;
            }
            message += '\n' + realChoiceStr;

        }

        if (error) {
            bottomContent = chalk.red('>> ') + error;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * A callback function for the event:
     * When the user press `Enter` key
     * 
     * @param {Object} state
     */
    onEnd(state) {

        this.status = 'answered';

        // Rerender prompt (and clean subline error)
        this.render();

        this.screen.done();
        cliCursor.show();
        this.done(state.value);

    }

    /**
     * A callback function for the event:
     * When something wrong happen
     * 
     * @param {Object} state
     */
    onError(state) {
        this.render(state.isValid);
    }


    /**
     * Get the current values of the selected choices
     * 
     * @return {Array}
     */
    getCurrentValue() {

        this.selection = _.map(this.checkedChoices, 'short');
        return _.map(this.checkedChoices, 'value');

    }


    /**
     *  @overwrite
     */
    onInverseKey() {

        var checkedChoices = this.checkedChoices;
        var self = this;
        this.choices.forEach(function (choice) {
            if (choice.type !== 'separator') {
                choice.checked = !choice.checked;
                // add
                if (choice.checked) {
                    checkedChoices.push(choice);
                } else {
                    _.remove(checkedChoices, function (checkedChoice) {
                        return _.isEqual(choice.value, checkedChoice.value);
                    });
                }
            }
        });

        this.render();

    }

    /**
     * A callback function for the event:
     * When the user press `Up` key
     */
    onUpKey() {

        var len = this.choices.realLength;
        this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
        this.render();

    }

    /**
     * A callback function for the event:
     * When the user press `Down` key
     */
    onDownKey() {

        var len = this.choices.realLength;
        this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
        this.render();

    }

    /**
     * A callback function for the event:
     * When the user press a number key
     */
    onNumberKey(input) {

        if (input <= this.choices.realLength) {
            this.pointer = input - 1;
            this.toggleChoice(this.choices.getChoice(this.pointer));
        }

        this.render();

    }

    /**
     * A callback function for the event:
     * When the user press `Space` key
     */
    onSpaceKey() {

        // When called no results
        if (!this.choices.getChoice(this.pointer)) {
            return;
        }

        this.toggleChoice(this.choices.getChoice(this.pointer));
        this.render();

    }
    /**
     *  @overwrite 
     */
    onAllKey() {

        var checkedChoices = this.checkedChoices;

        var shouldBeChecked = Boolean(
            this.choices.find(function (choice) {
                return choice.type !== 'separator' && !choice.checked;
            })
        );
        this.choices.forEach(function (choice) {
            if (choice.type !== 'separator') {
                choice.checked = shouldBeChecked;
            }
            // add 
            if (shouldBeChecked) {
                checkedChoices.push(choice);
            }
        });

        // add 
        !shouldBeChecked && (this.checkedChoices = []);

        this.render();

    }

    onKeypress({ key }) {
        // add 
        if (key && key.name == 'backspace') {
            this.backspace = true;
        }
        this.executeSource();
        this.render();
        this.backspace = false;
    }

    onHKey() {
        if (!this.choices.hasHead(this.pointer) || !this.opt.subsource) {
            return this.bell();
        }
        var currentChoice = this.choices.getChoice(this.pointer);
        // if currentChoice is disabled, currentChoice will be undefined
        // so we should get the raw choice
        currentChoice  = currentChoice || this.choices.choices[0];
        this.choices = currentChoice.heads;
        this.pointer = currentChoice.headPointer;
        this.checkedChoices.length = 0;
        this.render();
    }

    onLKey() {
        // if this.choices doest not have realChoice then return 
        if (!this.choices.realLength || !this.opt.subsource){
            return this.bell();
        }
        this.checkedChoices.length = 0;
        this.executeSource(true);
        this.render();
    }

    onHomeKey() {
        this.pointer = 0;
        this.render();
    }

    onEndKey() {
        this.pointer = this.choices.realLength - 1;
        this.render();
    }

    // H key event
    hKey() {
        return [
            filter(({ key }) => key.name === 'h' || (key.name === 'h' && key.ctrl)),
            share(),
        ]
    }

    // l key event
    lKey() {
        return [
            filter(({ key }) => key.name === 'l' || (key.name === 'l' && key.ctrl)),
            share(),
        ]
    }

    // gg key events 
    homeKey() {
        return [
            filter(({ key }) => key.name === 'g' || (key.name === 'g' && key.ctrl)),
            skip(1),
            share(),
        ]
    }

    // G key events 
    endKey() {
        return [
            filter(({ key }) => key.sequence === 'G' || (key.sequence === 'G' && key.ctrl)),
            share(),
        ]
    }

    /**
     * Toggle (check/uncheck) a specific choice
     *
     * @param {Boolean} checked if not specified the status will be toggled
     * @param {Object}  choice
     */
    toggleChoice(choice, checked) {

        // Default value for checked
        if (typeof checked === 'undefined') {
            checked = !choice.checked;
        }

        // Remove the choice's value from the checked values
        _.remove(this.value, _.isEqual.bind(null, choice.value));

        // Remove the checkedChoices with the value of the current choice
        _.remove(this.checkedChoices, function (checkedChoice) {
            return _.isEqual(choice.value, checkedChoice.value);
        });

        choice.checked = false;

        // Is the choice checked
        if (checked) {
            this.value.push(choice.value);
            this.checkedChoices.push(choice);
            choice.checked = true;
        }

    }

    /**
     * Get the checkbox figure (sign)
     * 
     * @param  {Boolean} checked
     * @return {String}
     */
    getCheckboxFigure(checked) {

        return checked ? chalk.green(figures.radioOn) : figures.radioOff;

    }


    executeSource(enabledSubSource) {
        var self = this;
        var sourcePromise = null;

        // Remove spaces
        this.rl.line = _.trim(this.rl.line);

        // add 
        if (this.rl.line === this.lastQuery && !this.filterSearch) {
            return;
        } else if (this.opt.enablebackspace && this.backspace === true) {
            return;
        }

        var choice = this.choices.getChoice(0) ;
        var type = choice && choice.type;
        var realChoice = this.choices.getChoice(this.pointer);

        if (enabledSubSource) {
            sourcePromise = this.opt.subsource(realChoice , type);
        } else if (this.opt.searchable) {
            sourcePromise = this.opt.source(this.answers, this.rl.line);
        } else {
            sourcePromise = this.opt.source(this.answers, null);
        }

        this.lastQuery = this.rl.line;
        this.lastSourcePromise = sourcePromise;
        this.searching = true;


        if (!(sourcePromise instanceof Promise)){
            throw new Error('source/subsource function must return a Promise');
        }

        sourcePromise.then(function (choices) {

            // Is not the last issued promise
            if (self.lastSourcePromise !== sourcePromise) {
                return;
            }

            // Reset the searching status
            self.searching = false;


            // Save the new choices
            var choices = new InnerChoices(choices, self.answers);

            if (!self.choices.length) {
                self.choices = choices;
            } else {
                var currentRealChoice = self.choices.getChoice(self.pointer) || {};
             
                if (!!choices.length && currentRealChoice.type ) {
                    self.choices.setTail(self.pointer, choices);
                } else {
                // currentRealChoice dost not have type and the children choices doest not have length , it will return
                    self.render();
                    self.default = null;
                    return;
                }
       
            }

            self.choices = choices;

            // Foreach choice
            self.choices.forEach(function (choice) {

                // Is the current choice included in the current checked choices
                if (_.findIndex(self.value, _.isEqual.bind(null, choice.value)) != -1) {
                    self.toggleChoice(choice, true);
                } else {
                    self.toggleChoice(choice, false);
                }

                // The default is not applied yet
                if (self.default) {

                    // Is the current choice included in the default values
                    if (_.findIndex(self.default, _.isEqual.bind(null, choice.value)) != -1) {
                        self.toggleChoice(choice, true);
                    }
                }

            });

            // Reset the pointer to select the first choice
            self.pointer = 0;
            self.render();
            self.default = null;

        });

        return sourcePromise;

    }

    // add
    toggleSearch() {
        this.filterSearch = !this.filterSearch;
    }

    bell() {
        process.stdout.write(ansiEscapes.beep);
    }
}

module.exports = CheckBoxPlus;