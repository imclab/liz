var EventScheduler = React.createClass({
  STEPS: ['form', 'select', 'confirm', 'create'],
  DURATIONS: [
    {value: '30 min'},
    {value: '1 hour'},
    {value: '1 hour 30 mins'},
    {value: '2 hours'},
    {value: '4 hours'},
    {value: '8 hours'}
  ],
  PERSISTENT_FIELDS: ['step', 'summary', 'attendees', 'duration', 'location', 'description', 'start', 'end'],
  DEFAULT_SUMMARY: 'New Event',
  DEFAULT_DURATION: '2 hours',

  getInitialState: function () {
    var user = this.props.user;

    // listen for changes in the hash value of step
    hash.onChange('step', function (step) {
      if (step != this.state.step && this.isMounted()) {
        this.setState({step: step});
      }
    }.bind(this));

    return {
      // TODO: receive the step from the parent component via props?
      step:         hash.get('step') || this.STEPS[0],

      // TODO: use these values directly from localStorage when rendering, no need to have a copy in this.state?
      summary:      localStorage['summary'] || this.DEFAULT_SUMMARY,
      attendees:    localStorage['attendees'] ?
          localStorage['attendees'].split(',') :
      user.email && [user.email],
      duration:     localStorage['duration'] || this.DEFAULT_DURATION,
      location:     localStorage['location'] || '',
      description:  localStorage['description'] || '',
      start:        localStorage['start'] || null,
      end:          localStorage['end'] || null,
      initialContacts: [
        {
          name: user.name,
          email: user.email,
          text: user.name + ' <' + user.email + '>'
        }
      ],
      freeBusy: null,
      timeslots: null
    };
  },

  render: function () {
    switch(this.state.step) {
      case 'select':
        return this.renderSelect();

      case 'confirm':
        return this.renderConfirm();

      case 'create':
        return this.renderCreate();

      default: // 'form'
        return this.renderForm();
    }
  },

  renderBreadcrumb: function () {
    // TODO: breadcrumb
    return <div>
      <ol className="breadcrumb breadcrumb-arrow">
        <li><a href="#">Input</a></li>
        <li><a href="#">Date selection</a></li>
        <li className="active">Confirmation</li>
      </ol>
    </div>;
  },

  renderForm: function () {
    console.log('this.state.attendees', this.state.attendees)

    return (
        <div className="scheduler">
          <form onSubmit={this.handleSubmit} >
            <table>
              <colgroup>
                <col width="100px" />
              </colgroup>
              <tr>
                <th>Title</th>
                <td><input type="text"
                    className="form-control"
                    name="summary"
                    ref="summary"
                    value={this.state.summary}
                    onChange={this.handleTextChange}
                /></td>
              </tr>
              <tr>
                <th>Attendees</th>
                <td><Selectize
                    ref="attendees"
                    className="form-control"
                    value={this.state.attendees}
                    create={true}
                    multiple={true}
                    preload={true}
                    load={this.loadContacts}
                    options={this.state.initialContacts}
                    placeholder="Enter one or multiple attendees..."
                    searchField={['name', 'email']}
                    sortField="text"
                    labelField="text"
                    valueField="email"
                    hideSelected={true}
                    handleChange={this.handleAttendeesChange}
                ></Selectize>
                </td>
              </tr>
              <tr>
                <th>Duration</th>
                <td>
                  <Selectize
                      ref="duration"
                      className="form-control"
                      value={this.state.duration}
                      create={true}
                      options={this.DURATIONS}
                      placeholder="Select a duration..."
                      labelField="value"
                      handleChange={this.handleDurationChange}
                  ></Selectize>
                </td>
              </tr>
              <tr>
                <th>Location</th>
                <td><input type="text"
                    className="form-control"
                    name="location"
                    ref="location"
                    value={this.state.location}
                    onChange={this.handleTextChange}
                /></td>
              </tr>
              <tr>
                <th>Description</th>
                <td><textarea
                    className="form-control"
                    name="description"
                    ref="description"
                    value={this.state.description}
                    onChange={this.handleTextChange}
                ></textarea>
                </td>
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
    if (this.state.error) {
      return (
          <div className="scheduler">
            <p className="error">{this.state.error.toString()}</p>
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
      )
    }
    else if (this.state.timeslots != null) {
      var error = null;

      // render errors
      var freeBusy = this.state.freeBusy;
      if (freeBusy) {
        var missing = Object.keys(freeBusy.errors);
        if (missing.length > 0) {
          var included = Object.keys(freeBusy.calendars).filter(function (calendarId) {
            return !freeBusy.calendars[calendarId].errors;
          });
          error = <p className="error">Error: Could not retrieve the availablility of all attendees.
            <br/><br/>
          The following dates are based on the availability of <b>{included.join(', ') || 'none'}</b>. Availability of <b>{missing.join(', ')}</b> is missing.</p>
        }
      }

      // find the selected timeslot based on start and end in the state
      var start = this.state.start;
      var end = this.state.end;
      var index = this.state.timeslots.findIndex(function (timeslot) {
        return timeslot.start == start && timeslot.end == end;
      });
      var selected = (index != -1) ? index : null;

      var timeslots = (this.state.timeslots.length > 0) ?
          <TimeslotList
              ref="timeslots"
              timeslots={this.state.timeslots}
              value={selected}
              onChange={this.handleTimeslotChange}
          /> :
          <p className="error">Sorry, there is no suitable date found to plan this event.</p>;

      return (
          <div className="scheduler">
            <p>
            Select any of the available dates for <b>{this.state.summary} (
            {juration.stringify(juration.parse(this.state.duration))})</b>:
            </p>
            {error}
            {timeslots}
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
      );
    }
    else { // loading
      return (
          <div className="scheduler">
            <p className="loading">Calculating available dates for <b>{this.state.summary} (
            {juration.stringify(juration.parse(this.state.duration))})</b> <img src="img/ajax-loader.gif" /></p>
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
      )
    }
  },

  renderConfirm: function () {
    return (
        <div className="scheduler">
          <p>
          Summary:
          </p>
          {this.renderEvent()}
          <p>
            <button onClick={this.back} className="btn btn-normal">Back</button
            > <button onClick={this.create} className="btn btn-primary">Create the event</button>
          </p>
        </div>
    );
  },

  renderCreate: function () {
    if (this.state.error) { // failed to create event
      return (
          <div className="scheduler">
            <p className="error">{this.state.error.toString()}</p>
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
      )
    }
    else if (this.state.created == true) { // created
      return (
          <div className="scheduler">
            <p>
            The event is created.
            </p>
            {this.renderEvent()}
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

  renderEvent: function () {
    return <table className="dates">
      <tr>
        <th>Title</th><td>{this.state.summary}</td>
      </tr>
      <tr>
        <th>Attendees</th><td>{this.renderAttendees()}</td>
      </tr>
      <tr>
        <th>Time</th><td>{formatHumanDate(this.state.start)} {formatTime(this.state.start)} &ndash; {formatTime(this.state.end)}</td>
      </tr>
      <tr>
        <th>Location</th><td>{this.state.location}</td>
      </tr>
      <tr>
        <th>Description</th><td>{this.state.description}</td>
      </tr>
    </table>;
  },

  renderAttendees: function () {
    return this.state.attendees.map(function (email) {
      var contact = this.getContact(email);
      return <div>{contact.name ? (contact.name + ' <' + contact.email + '>') : contact.email}</div>;
    }.bind(this))
  },

  back: function () {
    var index = this.STEPS.indexOf(this.state.step);
    var prevStep = this.STEPS[index - 1];

    if (prevStep ) {
      this.setState({step: prevStep});
    }
  },

  done: function () {
    var user = this.props.user;

    // go to the first step (form), and reset the inputs
    this.setState({
      step: this.STEPS[0],
      summary: this.DEFAULT_SUMMARY,
      attendees: user.email && [user.email],
      duration: this.DEFAULT_DURATION,
      location: '',
      description: ''
    });
  },

  handleSubmit: function (event) {
    // prevent real submission of the HTML form
    event.preventDefault();

    this.setState({step: 'select'});
  },

  handleDurationChange: function (value) {
    this.setState({duration: value});
  },

  handleAttendeesChange: function (value) {
    this.setState({attendees: value});
  },

  handleTextChange: function () {
    this.setState({
      summary: this.refs.summary.getDOMNode().value,
      location: this.refs.location.getDOMNode().value,
      description: this.refs.description.getDOMNode().value
    });
  },

  handleTimeslotChange: function (selected) {
    var timeslot = this.state.timeslots[selected];
    this.setState({
      step: 'confirm',
      start: timeslot.start,
      end: timeslot.end
    });
  },

  getContact: function (email) {
    if (this.contacts) {
      var contact = this.contacts.filter(function (contact) {
        return contact.email == email;
      })[0];
      if (contact) {
        return contact;
      }
    }

    return {email: email};
  },

  loadContacts: function (query, callback) {
    // TODO: replace loading the whole contact list with a filtered one with every change of input

    var me = this;
    if (this.contacts) {
      return callback(this.contacts);
    }

    ajax.get('/contacts')
        .then(function (rawContacts) {
          console.log('contacts', rawContacts);

          var contacts = rawContacts.map(function (contact) {
            return {
              name: contact.name,
              email: contact.email,
              text: contact.name ? (contact.name + ' <' + contact.email + '>') : contact.email
            }
          });

          // append the user itself if missing in the contacts
          var containsUser = rawContacts.some(function (contact) {
            return contact.email == me.props.user.email;
          });
          if (!containsUser) {
            contacts = contacts.concat(me.state.initialContacts);
          }

          // cache the loaded contacts
          me.contacts = contacts;

          callback(contacts);
        }.bind(this))
        .catch(function (err) {
          callback([]);
          console.log(err);
          displayError(err);
        }.bind(this))
  },

  // the moment supreme: create the event
  create: function () {
    this.setState({
      step: 'create',
      created: false,
      error: null
    });

    var calendarId = this.props.user.email;
    var event = {
      attendees: this.state.attendees.map(function (email) {
        var contact = this.getContact(email);
        return {
          email: contact.email,
          displayName: contact.name
        };
      }.bind(this)),
      summary: this.state.summary,
      location: this.state.location,
      description: this.state.description,
      start: {dateTime: this.state.start},
      end: {dateTime: this.state.end}
    };
    console.log('event', event);

    ajax.put('/calendar/' + calendarId, event)
        .then(function (response) {
          console.log('event created', response);
          this.setState({
            created: true
          });
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          this.setState({error: err});
        }.bind(this));
  },

  componentDidMount: function() {
    this.loadContents();
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.step !== this.state.step) {
      hash.set({step: this.state.step});
      this.loadContents();
    }
  },

  loadContents: function () {
    if (this.state.step == 'form') {
      // set focus to the summary input box
      this.selectSummary();
    }

    if (this.state.step == 'select') {
      // load available timeslots from the server
      this.calculateTimeslots();
    }
  },

  // store the current state in localStorage
  storeState: function () {
    this.PERSISTENT_FIELDS.forEach(function (field) {
      // Note: the array attendees is implicitly stringified entries separated by comma's
      localStorage[field] = this.state[field];
    }.bind(this));
  },

  // calculate available time slots
  calculateTimeslots: function () {
    this.setState({
      timeslots: null,
      error: null
    });

    var attendees = this.state.attendees.join(',');
    return ajax.get('/freeBusy/?calendars=' + encodeURIComponent(attendees))
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          var free = freeBusy.free || [];
          var duration = juration.parse(this.state.duration) * 1000; // from seconds to ms
          var timeslots = intervals.generateTimeslots(free, duration);

          console.log('timeslots', timeslots);

          this.setState({
            timeslots: timeslots,
            freeBusy: freeBusy,
            error: null
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({error: err});
          console.log(err);
        }.bind(this));
  },

  // Set focus to the title input
  selectSummary: function () {
    this.refs.summary && this.refs.summary.getDOMNode().select();
  }
});
