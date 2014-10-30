var EventScheduler = React.createClass({
  STEPS: ['input', 'select', 'create'],
  DURATIONS: [
    {value: '30 min'},
    {value: '1 hour'},
    {value: '1 hour 30 mins'},
    {value: '2 hours'},
    {value: '4 hours'},
    {value: '8 hours'}
  ],

  getInitialState: function () {
    var user = this.props.user;

    return {
      step: this.STEPS[0],
      summary: 'new event',
      attendees:  user && user.email && [user.email],
      initialContacts: [
        {
          name: user.name,
          email: user.email,
          text: user.name + ' <' + user.email + '>'
        }
      ],
      location: '',
      duration: '1 hour',
      description: '',
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

  componentDidMount: function() {
    // Set initial focus to the title input
    this.refs.summary.getDOMNode().select();
  },

  renderInput: function () {
    return (
        <div className="scheduler">
          <form onSubmit={this.calculateTimeslots} >
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
                    onChange={this.handleChange}
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
                    onChange={this.handleChange}
                /></td>
              </tr>
              <tr>
                <th>Description</th>
                <td><textarea
                    className="form-control"
                    name="description"
                    ref="description"
                    value={this.state.description}
                    onChange={this.handleChange}
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
      return (
          <div className="scheduler">
            <p>
            Select any of the available dates for <b>{this.state.summary} (
            {juration.stringify(juration.parse(this.state.duration))})</b>:
            </p>
              <p style={{color:'red'}}>WARNING: this list does not yet reckon the free/busy profiles of others than the logged in user.</p>
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
            <p className="loading">Calculating available dates for <b>{this.state.summary} (
            {juration.stringify(juration.parse(this.state.duration))})</b> <img src="img/ajax-loader.gif" /></p>
            <p>
              <button onClick={this.back} className="btn btn-normal">Back</button>
            </p>
          </div>
          )
    }
  },

  renderCreate: function () {
    if (this.state.error) {
      return (
          <div className="scheduler">
            <p className="error">{this.state.error.toString()}</p>
            <p>
              <button onClick={this.done} className="btn btn-normal">Back</button>
            </p>
          </div>
      )
    }
    else if (this.state.created == true) {
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
                <th>Attendees</th><td>{this.renderAttendees()}</td>
              </tr>
              <tr>
                <th>Time</th><td>{formatHumanDate(this.state.timeslot.start)} {formatTime(this.state.timeslot.start)} &ndash; {formatTime(this.state.timeslot.end)}</td>
              </tr>
              <tr>
                <th>Location</th><td>{this.state.location}</td>
              </tr>
              <tr>
                <th>Description</th><td>{this.state.description}</td>
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
    this.setState({
      step: this.STEPS[0]
    });
  },

  handleDurationChange: function (value) {
    // TODO: store the state in the pages url hash too
    this.setState({
      duration: value
    })
  },

  handleAttendeesChange: function (value) {
    // TODO: store the state in the pages url hash too
    this.setState({
      attendees: value
    });
  },

  handleChange: function () {
    // TODO: store the state in the pages url hash too
    this.setState({
      summary: this.refs.summary.getDOMNode().value,
      location: this.refs.location.getDOMNode().value,
      description: this.refs.description.getDOMNode().value
    })
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
        })
        .catch(function (err) {
          callback([]);
          console.log(err);
          displayError(err);
        })
  },

  calculateTimeslots: function (event) {
    event.preventDefault(); // prevent form from submitting

    this.setState({
      step: 'select',
      timeslots: null,
      selected: null,
      error: null
    });

    // calculate available time slots
    return ajax.get('/freeBusy/')
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          var free = freeBusy.free || [];
          var duration = juration.parse(this.state.duration) * 1000; // from seconds to ms
          var timeslots = intervals.generateTimeslots(free, duration);

          console.log('timeslots', timeslots);

          this.setState({
            timeslots: timeslots
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({error: err});
          console.log(err);
        }.bind(this));
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
      created: false,
      error: null
    });

    var calendarId = this.props.user.email;
    var event = {
      attendees: this.state.attendees.map(function (email) {
        return {email: email};
      }),
      summary: this.state.summary,
      location: this.state.location,
      description: this.state.description,
      start: {dateTime: timeslot.start},
      end: {dateTime: timeslot.end}
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
  }
});
