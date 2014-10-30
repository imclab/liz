// Wrapper around the selectize jQuery plugin.
// https://gist.github.com/HeyImAlex/d72d88fd606bbdf80f64
var Selectize = React.createClass({
  getDefaultProps: function() {
    return {
      // HTML attrs
      disabled: false,
      multiple: false,
      // -- unsupported --
      //autofocus: false,
      //form: null,
      //name: null
      //required: false
      //size: 0

      // Extra options
      placeholder: 'Select an option...',

      // Component options
      value: '',
      handleChange: $.noop
    };
  },
  getValue: function() {
    return this.selectize.getValue();
  },

  create: function() {
    var self = this;

    var options = {};
    selectizeOptNames.forEach(function(optName) {
      if (optName in self.props) {
        options[optName] = self.props[optName];
      }
    });

    this.selectize = (
        $(this.refs.select.getDOMNode())
            .selectize(options)
    )[0].selectize;

    this.selectize.setValue(this.props.value);

    this.selectize.on('change', this.handleChange);
  },
  destroy: function() {
    this.selectize.destroy();
  },

  shouldComponentUpdate: function(nextProps) {
    var self = this;
    var shouldUpdate = Object.keys(nextProps).some(function(propName) {
      // If it's handled, we'll deal with it on our own.
      if (propName in handledProps) return false;

      return nextProps[propName] !== self.props[propName];
    });
    if (shouldUpdate) return true;

    this._updating = true;

    // Handle our handledProps if they've changed.
    // If they're not here, they probably need no handling.

    if (nextProps.disabled !== this.props.disabled) {
      if (nextProps.disabled) {
        this.selectize.disable();
      }
      else {
        this.selectize.enable();
      }
    }

    if (nextProps.placeholder !== this.props.placeholder) {
      this.selectize.settings.placeholder = nextProps.placeholder;
      this.selectize.updatePlaceholder();
    }

    if (nextProps.options !== this.props.options &&
        !identicalArray(this.props.options, nextProps.options)) {
      // Synchronously update the options, as
      // Selectize's async load function causes
      // issues.
      this.selectize.clearOptions();
      nextProps.options.forEach(function(option) {
        self.selectize.addOption(option);
      });
      this.selectize.refreshOptions(false);
    }

    if (nextProps.value !== this.props.value) {
      if (nextProps.multiple && nextProps.value !== null) {
        if (!identicalArray(nextProps.value, this.getValue())) {
          this.selectize.setValue(nextProps.value);
        }
      }
      else {
        if (nextProps.value !== this.getValue()) {
          this.selectize.setValue(nextProps.value);
        }
      }
    }

    this._updating = false;

    return false;
  },

  handleChange: function(value) {
    // Because handleChange often triggers state
    // changes in containing components, we need to
    // make sure that we're not currently updating from
    // within another state change (otherwise react
    // will throw an InvariantError).
    if (!this._updating) {
      this.props.handleChange(value);
    }
  },
  componentDidMount: function() {
    this.create();
  },
  componentWillUnmount: function() {
    this.destroy();
  },
  componentWillUpdate: function() {
    this.destroy();
  },
  componentDidUpdate: function() {
    this.create();
  },

  render: function() {
    var opts = {
      ref: 'select',
      className: "form-control"
    };
    if (this.props.disabled) {
      opts.disabled = true;
    }
    if (this.props.multiple) {
      opts.multiple = true;
    }
    return React.DOM.div({className: 'form-group'},
        React.DOM.select(opts)
    );
  }
});

function identicalArray(a1, a2){
  return (
  a1.length === a2.length &&
  !a1.some(function(e, idx) { return a2[idx] !== e; })
  );
}

const selectizeOptNames = [
  'delimiter',
  'diacritics',
  'create',
  'createOnBlur',
  'createFilter',
  'highlight',
  'persist',
  'openOnFocus',
  'maxOptions',
  'maxItems',
  'hideSelected',
  'scrollDuration',
  'loadThrottle',
  'preload',
  'dropdownParent',
  'addPrecedence',
  'selectOnTab',
  'options',
  'dataAttr',
  'valueField',
  'optgroupValueField',
  'labelField',
  'optgroupLabelField',
  'optgroupField',
  'sortField',
  'searchField',
  'searchConjunction',
  'optgroupOrder',
  'load',
  'score',
  'render',

  // Unofficial, but works as expected.
  'placeholder'
];

var handledProps = {
  value:        true,
  disabled:     true,
  placeholder:  true,
  handleChange: true,
  options:      true
};
