/**
 * Display a table with upcoming availability events
 *
 * Create:
 *
 *   <AvailabilityEvents calendar={...} tag={...} />
 *
 * Where:
 *
 *   - `calendar` is the id of a calendar
 *   - `tag` is the availability tag of the availability events
 *
 * Methods:
 *
 *   - `refresh()`  Reload the events from the server
 */
var AvailabilityEventList = React.createClass({
  getInitialState: function () {
    return {
      events: null,
      loading: false,
      loadedCalendar: null,
      loadedTag: null,
      error: null
    };
  },

  render: function () {
    if (this.state.loading) {
      return <span>loading <img className="loading" src="img/ajax-loader.gif" /></span>;
    }
    else if (this.state.error) {
      return <p className="error">{this.state.error.toString()} <a href="#" onClick={this.retry}>retry</a></p>;
    }
    else if (this.state.events && this.state.events.length > 0) {
      var rows = this.state.events.map(function (event) {
        return <tr key={event.id}>
          <td>{moment(event.start.dateTime).format('ddd')}</td>
          <td>{formatTime(event.start.dateTime)} &ndash; {formatTime(event.end.dateTime)}</td>
        </tr>;
      });

      return <table className="days">
        <tbody>
        {rows}
          <tr><td>...</td><td></td></tr>
        </tbody>
      </table>;
    }
    else {
      return <span className="warning"><span className="glyphicon glyphicon-warning-sign"></span> no availability events found</span>;
    }
  },

  componentDidUpdate: function () {
    // if the calendar or tag changed, load availability events
    if (this.state.calendar !== this.props.calendar || this.state.tag !== this.props.tag) {
      this.state.calendar = this.props.calendar;
      this.state.tag = this.props.tag;

      (this.state.events === null) ? this.loadEvents() : this.delayedLoadEvents();
    }
  },

  // load events after a timeout of 500ms
  delayedLoadEvents: function () {
    clearTimeout(this._loadEventsTimeout);
    this._loadEventsTimeout = setTimeout(this.loadEvents.bind(this), 1000);
  },
  _loadEventsTimeout: null,

  loadEvents: function () {
    if (!this.props.calendar) {
      console.log('Cannot load availability events, no calendar provided');
      return;
    }

    console.log('Loading availability events. calendar: ' + this.props.calendar + ' tag: ' + this.props.tag);

    this.setState({
      loading:  true,
      error:    null
    });

    ajax.get('/calendar/' + this.props.calendar)
        .then(function (events) {

          var sevenDays = moment().add(7, 'day');
          var filtered = events.items && (events.items || events.events)
              .filter(function (event) {
                return (event.summary.trim().toLowerCase() === this.props.tag.toLowerCase())
                    && (moment(event.start.dateTime) < sevenDays);
              }.bind(this))
              .slice(0, 10); // max ten items

          console.log('availability events', filtered);

          this.setState({
            loading: false,
            events: filtered
          });

        }.bind(this))
        .catch(function (err) {
          this.setState({
            loading: false,
            error: err
          });
          console.log(err);
        }.bind(this));
  },

  retry: function (event) {
    event.preventDefault();
    event.stopPropagation();

    // setting tag or calendar to null will trigger reloading of the events
    // on next render
    this.setState({
      calendar: null,
      tag: null,
      error: null
    });
  }
});