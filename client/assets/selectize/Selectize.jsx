/**
 * React wrapper for the Selectize.js control
 * https://github.com/brianreavis/selectize.js
 *
 * Other implementation: https://gist.github.com/HeyImAlex/d72d88fd606bbdf80f64
 *
 * Usage:
 *
 *   <Selectize value={this.state.value} options={this.state.options} onChange={this.handleChange} />
 *   <Selectize value={this.state.value} options={this.state.options} onChange={this.handleChange} multiple="true" />
 *   <Selectize value={this.state.value} options={this.state.options} onChange={this.handleChange} disabled="true" />
 *
 * Where:
 *
 * - `value` is a string
 * - `options` is an array containing obects like {value: string, text: string}
 * - `onChange` is a function, called with the new value (a string) as argument
 *
 * And you can use all options available for selectize.js
 *
 * Selectize methods can be accessed like:
 *
 *   <Selectize ref="mySelectize" ... />
 *
 *   this.refs.mySelectize.selectize.focus();
 */
var Selectize = React.createClass({
  render: function() {
    if (this.props.multiple) {
      return <input ref="selectize" />;
    }
    else {
      return <select ref="selectize" />;
    }
  },

  componentDidMount: function() {
    this.update();
  },

  componentDidUpdate: function () {
    this.update();
  },

  componentWillUnmount: function() {
    this.destroy();
  },

  update: function () {
    var options = this.getOptions();
    var value = options.value;
    delete options.value;

    // TODO: dynamically update options, instead of recreating the control in that case

    // test whether the settings are changed, in that case the control must
    // be re-created
    // TODO: this deep comparison, this is dangerous, object keys are unordered
    var changed = JSON.stringify(options) != JSON.stringify(this.prevOptions);
    if (changed) {
      this.destroy();
      this.prevOptions = options;
    }

    // create the selectize control once
    if (!this.selectize) {
      this.selectize = $(this.refs.selectize.getDOMNode())
          .selectize(options)[0].selectize;
    }

    // update value and options
    var current = this.selectize.getValue();
    if (current != value) {
      if (this.props.multiple && !Array.isArray(value)) {
        value = value.split(this.selectize.settings.delimiter);
      }
      this.selectize.setValue(value);
    }
    this.selectize.refreshItems();
    this.selectize.refreshOptions(false);

    this.props.disabled ? this.selectize.disable() : this.selectize.enable();
  },

  destroy: function () {
    if (this.selectize) {
      this.selectize.destroy();
      this.selectize = null;
    }
  },

  getOptions: function () {
    var options = {};

    for(var prop in this.props) {
      if (this.props.hasOwnProperty(prop) && prop !== 'onChange') {
        options[prop] = this.props[prop];
      }
    }

    options.onChange = function (value) {
      this.handleChange(value);
    }.bind(this);

    return options;
  },

  handleChange: function (value) {
    if (value != this.props.value && this.props.onChange) {
      // wrap in a setTimeout 0 as this trigger may cause a full re-render of
      // the Selectize control
      setTimeout(function () {
        this.props.onChange(value);
      }.bind(this), 0)
    }
  }
});
