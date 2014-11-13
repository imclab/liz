/**
 * Usage:
 *
 *   <EventScheduler user={Object} />
 *
 * Where:
 *
 * - `user` is an object with the following structure:
 *
 *       {
 *         name: string,
 *         email: string
 *       }
 *
 */
var EventScheduler = React.createClass({
  STEPS: ['form', 'select', 'confirm', 'done'],
  DURATIONS: [
    {value: '30 min'},
    {value: '1 hour'},
    {value: '1 hour 30 mins'},
    {value: '2 hours'},
    {value: '4 hours'},
    {value: '8 hours'}
  ],
  FIELDS: ['summary', 'attendees', 'duration', 'location', 'description', 'start', 'end'],

  getInitialState: function () {
    var user = this.props.user;

    this.DEFAULT = {
      summary: 'New Event',
      attendees: user.email || '',
      duration: '2 hours',
      location: '',
      description: '',
      start: '',
      end: ''
    };

    // listen for changes in the hash value of step
    hash.onChange('step', function (step) {
      if (step != this.state.step && this.isMounted()) {
        this.setState({step: step});
      }
    }.bind(this));

    var initialState = {
      step:         hash.get('step') || this.STEPS[0],
      contacts: [this.getOwnContact()],
      freeBusy: null,
      timeslots: null,
      error: null
    };

    // load stored values (or default values)
    this.FIELDS.forEach(function (key) {
      initialState[key] = this.getStore(key);
    }.bind(this));

    return initialState;
  },

  render: function () {
    switch(this.state.step) {
      case 'select':
        return this.renderSelect();

      case 'confirm':
        return this.renderConfirm();

      case 'done':
        return this.renderDone();

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
    var duration = this.state.duration;
    var durations = this.DURATIONS;
    if (durations.indexOf(duration) == -1) {
      durations.push({value: duration});
    }

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
                    options={this.state.contacts}
                    create={true}
                    createOnBlur={true}
                    multiple={true}
                    placeholder="Select one or multiple attendees..."
                    searchField={['name', 'email']}
                    sortField="text"
                    labelField="text"
                    valueField="email"
                    hideSelected={true}
                    onChange={this.handleAttendeesChange}
                ></Selectize>
                </td>
              </tr>
              <tr>
                <th>Duration</th>
                <td>
                  <Selectize
                      ref="duration"
                      className="form-control"
                      value={duration}
                      multipe={false}
                      create={true}
                      createOnBlur={true}
                      options={durations}
                      placeholder="Select a duration..."
                      labelField="value"
                      onChange={this.handleDurationChange}
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
      var errors = this.state.freeBusy && this.state.freeBusy.errors;
      if (errors && errors.length > 0) {
        var missing = errors.map(function (error) {
          return error.id;
        });
        error = <p className="error">Error: Could not retrieve the availablility of all attendees
          . The following dates are calculated without the availability of <b>{missing.join(', ')}</b>.</p>
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
    var creating = this.state.creating ?
      <span className="loading">Creating event... <img src="img/ajax-loader.gif" /></span> :
      <span></span>;

    // TODO: be able to cancel while creating
    return <div className="scheduler">
        <p>
        Summary:
        </p>
        {this.renderEvent()}
        <p>
          {this.state.error != null ? this.state.error.toString() : ''}
        </p>
        <p>
          <button onClick={this.back} className="btn btn-normal">Back</button
          > <button onClick={this.create} className="btn btn-primary" disabled={this.state.creating}>Create the event</button>
        {creating}
        </p>
    </div>;
  },

  renderDone: function () {
    return <div className="scheduler">
        <p>
        The event is created.
        </p>
        {this.renderEvent()}
        <p>
          <button onClick={this.done} className="btn btn-primary">Done</button>
        </p>
    </div>;
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
    return this.state.attendees
        .split(',')
        .map(function (email) {
          var contact = this.getContact(email);
          console.log('contact', email, contact)
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
    // reset all form input values
    this.setStore(this.DEFAULT);
    this.setState(this.DEFAULT);

    // go to the first step (form), and reset the inputs
    this.setState({step: this.STEPS[0]});
  },

  handleSubmit: function (event) {
    // prevent real submission of the HTML form
    event.preventDefault();

    // apply form validation
    var err = this.prehistoricFormValidation();
    if (err) {
      alert(err);
      return;
    }

    this.setState({step: 'select'});
  },

  handleDurationChange: function (value) {
    this.setStore({duration: value});
    this.setState({duration: value});
  },

  handleAttendeesChange: function (value) {
    this.setStore({attendees: value || ''});
    this.setState({attendees: value || ''});
  },

  handleTextChange: function () {
    var fields = {
      summary: this.refs.summary.getDOMNode().value,
      location: this.refs.location.getDOMNode().value,
      description: this.refs.description.getDOMNode().value
    };
    this.setStore(fields); // persist state
    this.setState(fields);
  },

  handleTimeslotChange: function (selected) {
    var timeslot = this.state.timeslots[selected];
    this.setState({
      step: 'confirm',
      start: timeslot.start,
      end: timeslot.end
    });
    this.setStore({
      start: timeslot.start,
      end: timeslot.end
    });
  },

  /**
   * Validate form inputs.
   * @returns {Error | null}  Returns an error if not ok,
   *                          returns null when ok
   */
  prehistoricFormValidation: function () {
    // TODO: nicer form validation, this is sooo primitive...
    if (!this.state.summary || this.state.summary.trim() == '') {
      return Error('Title is empty');
    }
    var attendees = this.state.attendees;
    if (!attendees || attendees.trim() == '') {
      return new Error('Attendees is empty');
    }
    var duration = this.state.duration;
    var validDuration = false;
    try {
      // see if parsing fails
      juration.parse(duration);
      validDuration = true;
    }
    catch (err) {
    }
    if (!duration || duration.trim() == '' || !validDuration) {
      return new Error('No valid duration');
    }
  },

  getContact: function (email) {
    if (this.state.contacts) {
      var contact = this.state.contacts.filter(function (contact) {
        return contact.email == email;
      })[0];
      if (contact) {
        return contact;
      }
    }

    return {email: email};
  },

  loadContacts: function () {
    Promise.all([
          ajax.get('/contacts'),
          ajax.get('/groups/list')
        ])
        .then(function (results) {
          var googleContacts = results[0];
          var groups = results[1];

          console.log('contacts', googleContacts);
          console.log('groups', groups);

          // format the google contacts
          var contacts = googleContacts.map(function (contact) {
            return {
              name: contact.name,
              email: contact.email,
              text: contact.name ? (contact.name + ' <' + contact.email + '>') : contact.email
            }
          });

          // format and merge the groups
          contacts = contacts.concat(groups.map(function (group) {
            return {
              name: group.name,
              email: group.id,
              //text: group.name + ' (' + group.count + ')' // TODO: how to format groups?
              text: group.name
            }
          }));

          // append the user itself if missing in the contacts
          var containsUser = contacts.some(function (contact) {
            return contact.email == this.props.user.email;
          }.bind(this));
          if (!containsUser) {
            contacts.push(this.getOwnContact());
          }

          this.setState({contacts: contacts});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  // the moment supreme: create the event
  create: function () {
    this.setState({
      creating: true,
      error: null
    });

    var calendarId = this.props.user.email;
    var event = {
      attendees: this.state.attendees.split(',').map(function (email) {
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
            creating: false,
            step: 'done'
          });
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          this.setState({
            error: err,
            creating: false
          });
        }.bind(this));
  },

  componentDidMount: function() {
    this.initStep();
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.step !== this.state.step) {
      hash.set({step: this.state.step});
      this.initStep();
    }
  },

  initStep: function () {
    if (this.state.step == 'form') {
      // set focus to the summary input box
      this.selectSummary();
      this.loadContacts();
    }

    if (this.state.step == 'select') {
      // load available timeslots from the server
      this.calculateTimeslots();
    }
  },

  // get contact object of the user itself
  getOwnContact: function () {
    var user = this.props.user;
    return {
      name: user.name,
      email: user.email,
      text: user.name + ' <' + user.email + '>'
    }
  },

  // calculate available time slots
  calculateTimeslots: function () {
    this.setState({
      timeslots: null,
      error: null
    });

    var attendees = this.state.attendees;
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
  },

  // load persisted value
  getStore: function (key) {
    var value = localStorage[key];
    return (value !== undefined) ? value : this.DEFAULT[key];
  },

  // persist values
  setStore: function (key, value) {
    if (typeof key === 'string') {
      localStorage[key] = value.toString();
    }
    else {
      Object.keys(key).forEach(function (k) {
        localStorage[k] = key[k].toString();
      })
    }
  }
});
