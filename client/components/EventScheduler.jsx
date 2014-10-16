/** @jsx React.DOM */

var EventScheduler = React.createClass({
  STEPS: ['input', 'select', 'create'],

  getInitialState: function () {
    return {
      step: this.STEPS[0],
      summary: 'new event',
      duration: 60,
      location: '',
      timeslots: null,
      timeslot: null,
      selected: null
    };
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
    // TODO: add a field for event description
    return (
        <div className="scheduler">
          <form onSubmit={this.calculateTimeslots} >
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
              <input type="submit" className="btn btn-primary" value="Find a date" />
            </p>
          </form>
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
                    timeslots={this.state.timeslots}
                    value={this.state.selected} /> :
                    <p className="error">Sorry, there is no suitable date found to plan this event.</p>
                }
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button
              > <button onClick={this.createEvent} className="btn btn-primary">Create event</button>
            </p>
          </div>
          );
    }
    else { // loading
      return (
          <div className="scheduler">
            <p className="loading">Calculating available dates for <b>{this.state.summary} ({this.state.duration} min)</b> <img src="img/ajax-loader.gif" /></p>
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
            <table className="dates">
              <tr>
                <th>Title</th><td>{this.state.summary}</td>
              </tr>
              <tr>
                <th>Location</th><td>{this.state.location}</td>
              </tr>
              <tr>
                <th>Time</th><td>{formatDate(this.state.timeslot.start)} {formatTime(this.state.timeslot.start)} &ndash; {formatTime(this.state.timeslot.end)}</td>
              </tr>
            </table>
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

  calculateTimeslots: function (event) {
    event.preventDefault(); // prevent form from submitting

    this.setState({
      step: 'select',
      timeslots: null,
      selected: null
    });

    // calculate available time slots
    return ajax.get('/freeBusy/')
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          var free = freeBusy.free;
          var duration = this.state.duration * (60 * 1000); // from minutes to ms
          var timeslots = generateTimeslots(free || [], duration);

          console.log('timeslots', timeslots);

          this.setState({
            timeslots: timeslots
          });
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        });
  },

  createEvent: function () {
    var selected = this.refs.timeslots.getValue();
    var timeslot = this.state.timeslots[selected];
    if (!timeslot) {
      alert('Select one of the available dates first');
      return;
    }

    this.setState({
      step: 'create',
      timeslot: timeslot,
      created: false
    });

    var calendarId = this.props.user.email;
    var event = {
      attendees: [
        {email: calendarId}
      ],
      summary: this.state.summary,
      location: this.state.location,
      start: {dateTime: timeslot.start},
      end: {dateTime: timeslot.end}
    };

    ajax.put('/calendar/' + calendarId, event)
        .then(function (response) {
          console.log('event created', response);
          this.setState({
            created: true
          });
        }.bind(this))
        .catch(function (err) {
          console.log('Error', err);
        }.bind(this));
  }
});
