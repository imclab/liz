/** @jsx React.DOM */

var HomePage = React.createClass({
  getInitialState: function () {
    return {
      user: null,
      timeslots: null,
      created: false
    };
  },

  render: function () {
    var user = this.state.user;

    if (user && user.loggedIn == true) {
      // logged in
      return (
          <div>
            <h1>Plan an event</h1>
            <EventScheduler user={user} />
          </div>
          );
    }
    else if (user && user.loggedIn == false) {
      // not logged in
      return (
          <div>
            <h1>Plan an event</h1>
            <p><a href='/user/signin' className="btn btn-primary">Sign in</a>
            </p>
          </div>
          );
    }
    else {
      // loading
      return (
          <div>
            loading...
          </div>
          );
    }
  }
});

var EventScheduler = React.createClass({
  STEPS: ['input', 'select', 'create'],

  getInitialState: function () {
    var params = queryparams.getAll();

    return {
      step: this.STEPS[0],
      summary: params.summary || 'new event',
      duration: params.duration || 60,
      location: params.location || '',
      selected: null
    };
  },

  componentWillUpdate: function (nextProps, nextState) {
    if (this.state.step != nextState.step) {
      if (nextState.step == 'select') {
        // calculate available time slots
        nextState.timeslots = null;
        nextState.selected = null;
        this.calculateTimeslots();
      }

      if (nextState.step == 'create') {
        nextState.timeslot = nextState.timeslots[nextState.selected];
        if (nextState.timeslot) {
          nextState.created = false;

          var calendarId = this.props.user.email;
          var event = {
            attendees: [
              {email: calendarId}
            ],
            summary: this.state.summary,
            location: this.state.location,
            start: {dateTime: nextState.timeslot.start},
            end: {dateTime: nextState.timeslot.end}
          };

          ajax.put('/calendar/' + calendarId, event)
              .then(function (response) {
                console.log('event created', response);
                this.setState({created: true});
              }.bind(this))
              .catch(function (err) {
                console.log('Error', err);
              }.bind(this));
        }
        else {
          throw new Error('No timeslot selected');
        }
      }
    }
  },

  render: function () {
    switch(this.state.step) {
      case 'select':
        return this.renderSelect();

      case 'create':
        return this.renderCreate();

      default: // step
        return this.renderInput();
    }
  },

  renderInput: function () {
    return (
        <div className="scheduler">
            <table>
              <tr>
                <th>Title</th>
                <td><input type="text"
                            className="form-control"
                            name="summary"
                            ref="summary"
                            value={this.state.summary}
                            onChange={this.handleChange} /></td>
              </tr>
              <tr>
                <th>Duration (minutes)</th>
                <td><input type="text"
                            className="form-control"
                            name="duration"
                            ref="duration"
                            value={this.state.duration}
                            onChange={this.handleChange} /></td>
              </tr>
              <tr>
                <th>Location</th>
                <td><input type="text"
                            className="form-control"
                            name="location"
                            ref="location"
                            value={this.state.location}
                            onChange={this.handleChange} /></td>
              </tr>
            </table>
            <p>
            <button onClick={this.next} className="btn btn-primary">Find a date</button>
            </p>
        </div>
        );
  },

  renderSelect: function () {
    if (this.state.timeslots != null) {
      return (
          <div className="scheduler">
            <p>
            Select any of the available dates for <b>{this.state.summary} ({this.state.duration} min)</b>:
            </p>
            {
                (this.state.timeslots.length > 0) ?
                <TimeslotList
                    ref="timeslots"
                    data={this.state.timeslots}
                    value={this.state.selected}
                    onChange={this.handleChecked} /> :
                <p className="error">Sorry, there is no suitable date found to plan this event.</p>
            }
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button
              > <button onClick={this.createEvent} className="btn btn-primary">Create</button>
            </p>
          </div>
          );
    }
    else { // loading
      return (
          <div className="scheduler">
            <p className="loading">Calculating available dates for <b>{this.state.summary} ({this.state.duration} min)</b>... <img src="img/ajax-loader.gif" /></p>
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
          )
    }
  },

  renderCreate: function () {
    if (this.state.created == true) {
      return (
          <div className="scheduler">
            <p>
            Event created
            </p>
            <ul>
              <li>Title: {this.state.summary}</li>
              <li>Start: {this.state.timeslot.start}</li>
              <li>End: {this.state.timeslot.end}</li>
            </ul>
            <p>
              <button onClick={this.done} className="btn btn-primary">Done</button>
            </p>
          </div>
          );
    }
    else { // creating...
      return (
          <div className="scheduler">
            <p className="loading">Creating event <b>{this.state.summary}</b>... <img src="img/ajax-loader.gif" /></p>
          </div>
          )
    }
  },

  next: function () {
    var index = this.STEPS.indexOf(this.state.step);
    var nextStep = this.STEPS[index + 1];

    if (nextStep) {
      this.setState({step: nextStep});
    }
  },

  back: function () {
    var index = this.STEPS.indexOf(this.state.step);
    var prevStep = this.STEPS[index - 1];

    if (prevStep ) {
      this.setState({step: prevStep});
    }
  },

  done: function () {
    this.setState({
      step: this.STEPS[0]
    });
  },

  handleChange: function () {
    this.setState({
      summary: this.refs.summary.getDOMNode().value,
      duration: this.refs.duration.getDOMNode().value,
      location: this.refs.location.getDOMNode().value
    })
  },

  handleChecked: function () {
    this.setState({
      selected: this.refs.timeslots.getCheckedValue()
    })
  },

  calculateTimeslots: function () {
    return ajax.get('/freeBusy/')
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          var free = freeBusy.free;
          var duration = this.state.duration * (60 * 1000); // from minutes to ms
          var timeslots = generateTimeslots(free || [], duration);

          console.log('timeslots', timeslots);

          this.setState({timeslots: timeslots});
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        })
  },

  createEvent: function () {
    if (this.state.selected == null) {
      alert('Select one of the dates first');
      return;
    }

    this.setState({step: 'create'});
  }
});

var TimeslotList = React.createClass({
  MAX_TIMESLOTS: 10,

  getInitialState: function () {
    return {
      value: this.props.value
    }
  },

  render: function() {
    var timeslots = this.props.data || [];

    var items = timeslots.slice(0, this.MAX_TIMESLOTS).map(function (timeslot, index) {
      return (<li key={timeslot.start}>
        <label>
          <input type="radio" name="timeslot" value={index + ''} onChange={this.handleChange}
          /> {formatDate(timeslot.start)} {formatTime(timeslot.start)} - {formatTime(timeslot.end)}
        </label>
      </li>);
    }.bind(this));

    return (<RadioGroup
        name="timeslots"
        value={this.state.value}
        ref="timeslots"
        onChange={this.handleChange}
        >
          <ul>{items}</ul>
        </RadioGroup>);
  },

  getCheckedValue: function () {
    return this.refs.timeslots.getCheckedValue();
  },

  setCheckedValue: function (value) {
    return this.refs.timeslots.setCheckedValue(value);
  },

  handleChange: function () {
    if (this.props.onChange) {
      this.props.onChange();
    }
  }
});

