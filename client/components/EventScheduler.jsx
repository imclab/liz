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
  STEPS: ['form', 'select', 'confirm', 'done'], // we also have a step 'cancel'
  DURATIONS: [
    {value: '30 min'},
    {value: '1 hour'},
    {value: '1 hour 30 mins'},
    {value: '2 hours'},
    {value: '4 hours'},
    {value: '8 hours'}
  ],
  FIELDS: ['summary', 'attendees', 'duration', 'location', 'description', 'start', 'end'],
  MAX_TIMESLOTS: 10,

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

    // check if this is a cancel or update
    var updateId = hash.get('update');
    var cancelId = hash.get('cancel');

    var initialState = {
      step: (cancelId != undefined) ? 'cancel' : hash.get('step') || this.STEPS[0],
      contacts: [this.getOwnContact()],
      freeBusy: null,
      timeslots: null,
      limitTimeslots: true,
      loadingTimeslots: false,
      loadingEvent: false,
      deletingEvent: false,
      canceled: false,
      updated: false,
      updateId: updateId,
      cancelId: cancelId,
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
      default: // 'form'
        return this.renderForm();

      case 'select':
        return this.renderSelect();

      case 'confirm':
        return this.renderConfirm();

      case 'done':
        return this.renderDone();

      case 'cancel':
        return this.renderCancel();
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

    var content = null;
    if (this.state.loadingEvent) {
      content = <p className="loading">Loading event details <img src="img/ajax-loader.gif" />
      </p>
    }
    else {
      content = <form onSubmit={this.handleSubmit} >
        <table>
          <colgroup>
            <col width="100px" />
          </colgroup>
          <tr>
            <th>Title</th>
            <td>
              <input type="text"
                  className="form-control"
                  name="summary"
                  ref="summary"
                  value={this.state.summary}
                  onChange={this.handleTextChange}
              />
            </td>
          </tr>
          <tr>
            <th>Attendees {this.renderPopover('Attendees', 'Select one or multiple attendees. You can select individuals and/or team members.')}</th>
            <td>
              <Selectize
                  ref="attendees"
                  className="form-control"
                  value={this.state.attendees}
                  options={this.getContacts()}
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
            <th>Duration {this.renderPopover('Duration', 'Choose a duration from the dropdown, or enter your own custom duration like "45min" or "1h 15m".')}</th>
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
            <td>
              <input type="text"
                  className="form-control"
                  name="location"
                  ref="location"
                  value={this.state.location}
                  onChange={this.handleTextChange}
              />
            </td>
          </tr>
          <tr>
            <th>Description</th>
            <td>
              <textarea
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
      </form>;
    }

    return (
        <div className="scheduler">
          {this.renderHeader()}
          {content}
        </div>
    );
  },

  renderSelect: function () {
    // render errors
    var error = this.state.error && <p className="error">{this.state.error.toString()}</p>;
    var errors = this.state.freeBusy && this.state.freeBusy.errors;
    if (error == undefined && errors != undefined && errors.length > 0) {
      var missing = errors.map(function (error) {
        return error.id;
      });
      error = <p className="error">Error: Could not retrieve the availablility of all
        attendees. The following dates are calculated without the availability of <b>{missing.join(', ')}</b>.</p>
    }

    // render timeslots (if loaded)
    var timeslots = null;
    if (this.state.timeslots) {
      // find the selected timeslot based on start and end in the state
      var start = this.state.start;
      var end = this.state.end;
      var index = -1;
      findIndex(this.state.timeslots, function (timeslot) {
        return timeslot.start == start && timeslot.end == end;
      });
      var selected = (index != -1) ? index : null;

      timeslots = (this.state.timeslots.length > 0) ?
          <TimeslotList
              ref="timeslots"
              timeslots={
                this.state.limitTimeslots ?
                    this.state.timeslots.slice(0, this.MAX_TIMESLOTS) :
                    this.state.timeslots
              }
              value={selected}
              onChange={this.handleTimeslotChange}
          /> :
          <p className="error">Sorry, there is no suitable date found to plan this event.</p>;
    }

    // show a loading message while calculating the available timeslots
    var loading = this.state.loadingTimeslots &&
        <p className="loading">Calculating dates <img src="img/ajax-loader.gif" /></p>;

    // show a button "Back" and a button "Find more dates"
    var back = <button onClick={this.back} className="btn btn-normal">Back</button>;
    var more;
    if (this.state.timeslots != null) {
      var title = this.isLimited() ?
        'Display more dates' :
        'Search for dates after ' + this.state.timeMax.format('YYYY-MM-DD');
      more = (this.state.timeslots != null) &&
          <button
              className="btn btn-primary"
              title={title}
              onClick={this.findMoreTimeslots}
          >Find more dates</button>;
    }
    var buttons = <p>{back} {more}</p>;

    return <div className="scheduler">
      {this.renderHeader()}
      <p>
        Select any of the available dates for <b>{this.state.summary} (
        {juration.stringify(juration.parse(this.state.duration))})</b>:
      </p>
      {error}
      {timeslots}
      {loading}
      {buttons}
    </div>
  },

  renderConfirm: function () {
    var busy = this.state.creating ?
      <span className="loading">{this.state.updateId ? 'Updating' : 'Creating'} event... <img src="img/ajax-loader.gif" /></span> :
      <span></span>;

    // TODO: be able to cancel while creating
    return <div className="scheduler">
        {this.renderHeader()}
        <p>
        Summary:
        </p>
        {this.renderEvent(this.state)}
        {this.state.error && <p className="error">{this.state.error.toString()}</p>}
        <p>
          <button onClick={this.back} className="btn btn-normal">Back</button>&nbsp;
          <button
              onClick={this.state.updateId ? this.updateEvent : this.createEvent}
              className="btn btn-primary"
              disabled={this.state.creating}
          >
            {this.state.updateId ? 'Update' : 'Create'} the event
          </button>&nbsp;
          {busy}
        </p>
    </div>;
  },

  renderDone: function () {
    return <div className="scheduler">
        {this.renderHeader()}
        <p>
        The event is {this.state.updateId ? 'updated' : 'created'}.
        </p>
        {this.renderEvent(this.state)}
        <p>
          <button onClick={this.done} className="btn btn-primary">Done</button>
        </p>
    </div>;
  },

  renderCancel: function () {
    var canceled = this.state.canceled || this.state.status == 'cancelled';
    var buttons;
    if (canceled) {
      buttons = <p>
        <button onClick={this.done} className="btn btn-primary">Done</button>
      </p>;
    }
    else {
      buttons = <p>
        <button onClick={this.done} className="btn btn-normal">Oops, don't cancel</button>&nbsp;
        <button
            onClick={this.cancelEvent}
            disabled={this.state.deletingEvent || this.state.loadingEvent}
            className="btn btn-danger"
        >Cancel</button>
      </p>;
    }

    return <div className="scheduler">
        <h1>Cancel an event</h1>
        {
          canceled ?
            <p>The event has been cancelled.</p> :
            <p>Do you want to cancel the following event&#63;</p>
        }
        {
          this.state.loadingEvent && <p className="loading">Loading event details <img src="img/ajax-loader.gif" /></p>
        }
        {
          (!this.state.loadingEvent && !canceled) && this.renderEvent(this.state)
        }
        {
          this.state.error &&
            <p className="error">{this.state.error.toString()}</p>
        }
        {
          this.state.deletingEvent && <p className="loading">Deleting event <img src="img/ajax-loader.gif" /></p>
        }
        {buttons}
    </div>;
  },

  /**
   * Render the header, "Plan an event" or "Update an event"
   */
  renderHeader: function () {
    return <h1>{this.state.updateId ? 'Update' : 'Plan'} an event</h1>;
  },

  /**
   * Render an event in a table
   * @param {{summary: string, attendees: string, start: string, end: string, location: string, description: string}} event
   * @returns {XML} Returns an HTML table
   */
  renderEvent: function (event) {
    return <table className="dates">
      <tr>
        <th>Title</th><td>{event.summary}</td>
      </tr>
      <tr>
        <th>Attendees</th><td>{this.renderAttendees(event.attendees)}</td>
      </tr>
      <tr>
        <th>Time</th><td>{formatHumanDate(event.start)} {formatTime(event.start)} &ndash; {formatTime(event.end)}</td>
      </tr>
      <tr>
        <th>Location</th><td>{event.location}</td>
      </tr>
      <tr>
        <th>Description</th><td>{this.removeFooter(event.description)}</td>
      </tr>
    </table>;
  },

  /**
   * Render a list with comma separated attendees in a div
   * @param {string} attendees
   * @returns {XML} Returns a DIV element
   */
  renderAttendees: function (attendees) {
    return attendees
        .split(',')
        .map(function (email) {
          var contact = this.getContact(email);
          return <div>{contact.name ? (contact.name + ' <' + contact.email + '>') : contact.email}</div>;
        }.bind(this))
  },

  renderPopover: function (title, content, placement) {
    return <a href="#" onClick={function (event) {event.preventDefault()}}>
      <span
          data-toggle="popover"
          data-placement={placement || 'top'}
          title={title}
          data-content={content}
          className="glyphicon glyphicon-info-sign"
          aria-hidden="true"
      ></span>
    </a>
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
    hash.remove('update'); // event id for updating a calendar event
    hash.remove('cancel'); // event id for deleting a calendar event

    // go to the first step (form), and reset the inputs
    this.setState({
      step: this.STEPS[0],
      updateId: null,
      cancelId: null
    });
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
    var contacts = this.getContacts();
    if (contacts) {
      var contact = contacts.filter(function (contact) {
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
          ajax.get('/groups')
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
          groups.forEach(function (group) {
            var exists = contacts.some(function (contact) {
              return contact.email == group.name;
            });

            if (!exists) {
              contacts.push({
                name: group.name,
                email: group.id,
                //text: group.name + ' (' + group.count + ')' // TODO: how to format groups?
                text: group.name
              });
            }
          });

          this.setState({contacts: contacts});
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          displayError(err);
        }.bind(this));
  },

  /**
   * Load a calendar event by its id
   * @param eventId
   */
  loadEvent: function (eventId) {
    var calendarId = this.props.user.email;

    this.setState({
      loadingEvent: true,
      canceled: false,
      updated: false
    });

    ajax.get('/calendar/' + calendarId + '/' + eventId)
        .then(function (googleEvent) {
          console.log('event loaded', googleEvent);

          var start = googleEvent.start.dateTime || googleEvent.start.date;
          var end = googleEvent.end.dateTime || googleEvent.end.date;
          var attendees;
          if (googleEvent.extendedProperties &&
              googleEvent.extendedProperties.shared &&
              googleEvent.extendedProperties.shared.attendees) {
            attendees = googleEvent.extendedProperties.shared.attendees;
          }
          else if (Array.isArray(googleEvent.attendees)) {
            attendees = googleEvent.attendees.map(function (attendee) {
              return attendee.email;
            }).join(',')
          }
          else {
            attendees = googleEvent.organizer.email;
          }
          var duration = juration.stringify((moment(end) - moment(start)) / 1000); //seconds

          var event = {
            summary: googleEvent.summary,
            attendees: attendees,
            duration: duration,
            location: googleEvent.location,
            description: this.removeFooter(googleEvent.description),
            start: start,
            end: end,
            status: googleEvent.status
          };

          this.setStore(event);
          this.setState(_.extend({loadingEvent: false}, event));
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          this.setState({
            loadingEvent: false,
            error: err
          });
        }.bind(this));
  },

  cancelEvent: function () {
    var calendarId = this.props.user.email;

    this.setState({deletingEvent: true});

    ajax.del('/calendar/' + calendarId + '/' + this.state.cancelId)
        .then(function () {
          this.setState({
            deletingEvent: false,
            canceled: true,
            event: null
          });
        }.bind(this))
        .catch(function (err) {
          console.log(err);
          this.setState({
            deletingEvent: false,
            error: err
          });
        }.bind(this));
  },

  // the moment supreme: create the event
  createEvent: function () {
    this.setState({
      creating: true,
      error: null
    });

    var calendarId = this.props.user.email;
    var event = this.generateEvent();
    console.log('event', event);

    ajax.post('/calendar/' + calendarId, event)
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

  // update an existing event
  updateEvent: function () {
    this.setState({
      creating: true,
      error: null
    });

    console.log('STATE',this.state)

    var calendarId = this.props.user.email;
    var event = this.generateEvent();
    var eventId = this.state.updateId;
    event.id = eventId;
    console.log('event', event);

    ajax.put('/calendar/' + calendarId + '/' + eventId, event)
        .then(function (response) {
          console.log('event updated', response);

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

  // build an event from the state of the EventScheduler
  generateEvent: function () {
    return {
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
      end: {dateTime: this.state.end},
      extendedProperties: {
        shared: {
          attendees: this.state.attendees // contains the original attendees (including teams)
        }
      }
    };
  },

  /**
   * Get contacts. Appends logged in user and current selection if missing
   */
  getContacts: function () {
    var contacts = this.state.contacts;

    // append the user itself if missing in the contacts
    var containsUser = contacts.some(function (contact) {
      return contact.email == this.props.user.email;
    }.bind(this));
    if (!containsUser) {
      contacts.push(this.getOwnContact());
    }

    // append current attendee selection if missing in the contacts
    if (this.state.attendees.trim() != '') {
      this.state.attendees.split(',').forEach(function (attendee) {
        var containsAttendee = contacts.some(function (contact) {
          return contact.email == attendee;
        });

        if (!containsAttendee) {
          contacts.push( {
            name:  attendee,
            email: attendee,
            text:  attendee
          });
        }
      });
    }

    return contacts;
  },

  componentDidMount: function() {
    this.initStep();

    // initialize all popovers
    $('[data-toggle="popover"]').popover();
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.step !== this.state.step) {
      hash.set({step: this.state.step});
      this.initStep();
    }

    // initialize all popovers
    $('[data-toggle="popover"]').popover();
  },

  initStep: function () {
    if (this.state.step == 'form') {
      // set focus to the summary input box
      this.selectSummary();
      this.loadContacts();
    }

    if (this.state.step == 'select') {
      // load available timeslots from the server
      var now = moment();
      var timeMin = moment(new Date(now.year(), now.month(), now.date()));
      var timeMax = timeMin.clone().add(14, 'days');

      this.setState({
        timeMin: timeMin,
        timeMax: timeMax,
        timeslots: null,
        limitTimeslots: true,
        error: null
      });
      this.findTimeslots(timeMin, timeMax);
    }

    if (this.state.step == 'cancel' && this.state.cancelId) {
      this.loadEvent(this.state.cancelId);
    }

    if (this.state.updateId && this.state.step == 'form') {
      this.loadEvent(this.state.updateId);
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
  findTimeslots: function (timeMin, timeMax) {
    this.setState({
      loadingTimeslots: true,
      error: null
    });

    var url = '/freeBusy/' +
        '?calendars=' + encodeURIComponent(this.state.attendees) +
        '&timeMin=' + timeMin.toISOString() +
        '&timeMax=' + timeMax.toISOString();

    return ajax.get(url)
        .then(function (freeBusy) {
          console.log('freeBusy', freeBusy);
          var free = freeBusy.free || [];
          var duration = juration.parse(this.state.duration) * 1000; // from seconds to ms
          var timeslots = intervals.generateTimeslots(free, duration);

          console.log('timeslots', timeslots);

          this.setState({
            timeslots: timeslots,
            freeBusy: freeBusy,
            loadingTimeslots: false,
            error: null
          });
        }.bind(this))
        .catch(function (err) {
          this.setState({
            loadingTimeslots: false,
            error: err
          });
          console.log(err);
        }.bind(this));
  },

  findMoreTimeslots: function () {
    if (this.isLimited()) {
      // show all timeslots, not just the first 10
      this.setState({
        limitTimeslots: false
      })
    }
    else {
      // add another 14 days to the interval
      var timeMin = this.state.timeMin;
      var timeMax = this.state.timeMax.clone().add(14, 'days');
      this.setState({
        limitTimeslots: false,
        timeMax: timeMax
      });

      this.findTimeslots(timeMin, timeMax);
    }
  },

  // test whether the current array with timeslots is limited to MAX_TIMESLOTS
  isLimited: function () {
    return this.state.limitTimeslots &&
        this.state.timeslots != null &&
        this.state.timeslots.length > this.MAX_TIMESLOTS;
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
        var value = key[k] || '';
        localStorage[k] = value.toString();
      })
    }
  },

  // remove the Liz footer from an event description
  removeFooter: function (description) {
    var index = description.indexOf('This event is created by Liz');
    return description.substring(0, index);
  }
});
