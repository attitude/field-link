riot.tag2('field-link', '<div> <div if="{!resultsLoaded}" class="uk-alert" if="{!fields.length}"> {App.i18n.get(\'Loading field\')} </div> <div if="{!opts.list && resultsLoaded && (!opts.hasOne || opts.hasOne && links.length < 1)}" name="autocomplete" class="uk-autocomplete uk-form-icon uk-form uk-width-1-1"> <i class="uk-icon-link"></i> <input name="input" class="uk-width-1-1 uk-form-blank" autocomplete="off" type="text" placeholder="{App.i18n.get(opts.placeholder || \'Add Link...\')}"> </div> <div if="{opts.list && resultsLoaded}" class="uk-form-icon uk-form uk-width-1-1"> <i class="uk-icon-link"></i> <input onkeydown="{keyUp}" onkeypress="{keyUp}" onkeyup="{keyUp}" name="filterinput" class="uk-width-1-1 uk-form-blank" autocomplete="off" type="text" placeholder="{App.i18n.get(opts.placeholder || \'Add Link...\')}"> <a if="{filterinput.value.trim().length > 0}" class="reset-field" onclick="{resetfilterinput}"><i class="uk-icon-times-circle"></i></a> </div> <div if="{resultsLoaded}" class="uk-margin-top uk-panel"> <ul class="uk-nav uk-nav-linked" each="{link,idx in links}"> <li><a onclick="{parent.remove}"><i class="uk-icon-close"></i> {linkName(link, idx)}</a></li> </ul> <div if="{opts.list}" class="list-entries {entriesFiltered.length > 6 ? \'is-overflown\' : \'\'}"> <ul if="{entriesFiltered.length > 0}" class="uk-nav"> <li each="{entry, idx in entriesFiltered}" onclick="{toggle}"> <a class="{idx === focusedEntry ? \'uk-selected\' : \'\'}"> <i class="uk-icon-plus"></i> <span>{entry.name || entry.title || entry.slug || entry._id}</span> </a> </li> </ul> <div if="{entriesFiltered.length < 1}" class="uk-alert">No entries</div> </div> </div> </div>', 'field-link .uk-nav-linked,[riot-tag="field-link"] .uk-nav-linked { background: white; } field-link .list-entries,[riot-tag="field-link"] .list-entries { max-height: 197px; overflow: auto; } field-link .uk-nav,[riot-tag="field-link"] .uk-nav { -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } field-link .is-overflown,[riot-tag="field-link"] .is-overflown { box-shadow: inset 0 -10px 30px -20px rgba(0,0,0,0.25); } field-link .reset-field,[riot-tag="field-link"] .reset-field { height: 30px; line-height: 30px; position: absolute; right: 0; text-align: center; top: 0; width: 30px; z-index: 1; }', '', function(opts) {
        if (opts.__proto__ && opts.__proto__.list) {
            opts.list = opts.__proto__.list;
        }

        if (!opts.collections) {
            opts.collections = [];
        } else if (typeof opts.collections === 'string') {
            opts.collections = opts.collections.replace(/\s+/g, '').split(',');
        } else if (Object.prototype.toString.call( opts.collections ) !== '[object Array]') {
            opts.collections = [];
        }

        var $this = this,

            collections = {},

            autocompleteDefaults = {
                source: [],
                template:   '<ul class="uk-nav uk-nav-autocomplete uk-autocomplete-results">' +
                                '{{~items}}' +
                                    '<li data-value="{{ $item._id }}">' +
                                        '<a>' +
                                            '{{ $item.name || $item.title || $item._id }}' +
                                        '</a>' +
                                    '</li>' +
                                '{{/items}}' +
                            '</ul>',
                minLength: 1
            },

            loadEntries = function () {
                return new Promise(function (fulfill, reject) {
                    Cockpit.callmodule('collections', 'collections', true, [true]).then(function (data) {
                        var propName,
                            collectionsResolved = 0,
                            i,
                            l,
                            removeIndexes = [];

                        if (data.result) {
                            collections = data.result;

                            l = opts.collections.length;

                            for (i = 0; i < l; i = i + 1) {

                                if (!collections.hasOwnProperty(opts.collections[i])) {

                                    removeIndexes.unshift(i);
                                }
                            }

                            l = removeIndexes.length;

                            for (i = 0; i < l; i = i + 1) {
                                opts.collections.splice(removeIndexes[i], 1);
                            }

                            $this.collectionsCount = Object.keys(collections).length;

                            for (propName in collections) {
                                if (collections.hasOwnProperty(propName)) {

                                    if (opts.collections && opts.collections.indexOf(propName) < 0) {
                                        collectionsResolved = collectionsResolved + 1;

                                        if ($this.collectionsCount === collectionsResolved) {
                                            fulfill($this.entries);
                                        }

                                        continue;
                                    }

                                    Cockpit.callmodule('collections', 'find', [
                                        propName,
                                        {
                                            sort: {
                                                _created: -1
                                            },
                                            limit: -1,
                                            "skip": 0
                                        }
                                    ], [
                                        propName,
                                        {
                                            sort: {
                                                _created: -1
                                            },
                                            limit: -1,
                                            "skip": 0
                                        }
                                    ]).then(function (data) {
                                        collectionsResolved = collectionsResolved + 1;

                                        if (data.result) {
                                            var i, l = data.result.length;

                                            for (i = 0; i < l; i = i + 1) {
                                                data.result[i]['_type'] = propName;

                                                if (!data.result[i].value) {
                                                    data.result[i].value = data.result[i].name || data.result[i].tile || data.result[i]._id;
                                                }
                                            }

                                            $this.entries = $this.entries.concat(data.result);
                                        }

                                        if ($this.collectionsCount === collectionsResolved) {
                                            fulfill($this.entries);
                                        }
                                    }).catch(function() {
                                        collectionsResolved = collectionsResolved + 1;

                                        if ($this.collectionsCount === collectionsResolved) {
                                            fulfill($this.entries);
                                        }
                                    });
                                }
                            }
                        } else {
                            reject();
                        }
                    }).catch(function(data) {
                        reject();
                    });
                });
            },
            fixKeyUpDelay,
            lastKeyEventTimestamp = null,
            lastKeyEventKeyCode = 0;

        this.links = [];
        this.resultsLoaded = false;
        this.collectionsCount = 0;

        this.entries = [];
        this.entriesFiltered = [];

        this.linkName = function (id, idx) {

            if (!$this.resultsLoaded) {
                return id;
            }

            var i, l = $this.entries.length;

            for (i = 0; i < l; i = i + 1) {
                if ($this.entries[i]._id == id) {
                    return $this.entries[i].name || $this.entries[i].title || id;
                }
            }

            if (id.match(/[0-9abdocef]{25}/)) {
                $this.links.splice(idx, 1);
                $this.$setValue($this.links);
            }

            return id;
        };

        this.on('mount', function () {
            loadEntries().then(function (data) {

                UIkit.autocomplete($this.autocomplete, _.defaults({source: data}, autocompleteDefaults));

                $this.resultsLoaded = true;

                $this.sortFilterEntries();

                $this.update();
            });

            App.$(this.root).on({

                'selectitem.uk.autocomplete keydown': function(e, data) {
                    var value = e.type=='keydown' ? $this.input.value : data.value;

                    if (e.type=='keydown' && e.keyCode != 13) {
                        return;
                    }

                    if (!value) {
                        return;
                    }

                    value = value.trim();

                    if (value) {

                        if (!value.match(/[0-9abdocef]{24,25}/)) {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            e.preventDefault();

                            if (!opts.createNew || opts.createNew && !collections.hasOwnProperty(opts.createNew)) {
                                App.ui.notify("Link does not exist.", "danger");

                                return;
                            }

                            Cockpit.callmodule(
                                'collections',
                                'save',
                                [opts.createNew, { name: value, title: value}],
                                [opts.createNew, { name: value, title: value}]
                            ).then(function (data) {
                                if (!data.result) {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                    e.preventDefault();

                                    App.ui.notify("Failed to create link. Try again later?", "danger");

                                    return;
                                }

                                if (!data.result.value) {
                                    data.result.value = data.result.name || data.result.tile || data.result._id;
                                }

                                $this.entries.push(data.result);

                                value = data.result._id;

                                UIkit.autocomplete($this.autocomplete, _.defaults({source: $this.entries}, autocompleteDefaults));

                                $this.links.push(value);
                                $this.$setValue(_.uniq($this.links));
                                $this.update();

                                return;
                            }).catch(function (data) {
                                App.ui.notify("Failed to create link. Try again later?", "danger");

                                $this.input.value = value;
                                $this.update();

                                return;
                            });

                            $this.input.value = '';
                            $this.autocomplete.className = $this.autocomplete.className.replace(/\buk-open\b/, '').trim();
                            $this.update();

                            return;
                        }

                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        e.preventDefault();
                        $this.links.push(value);
                        $this.input.value = "";
                        data.value = null;
                        $this.$setValue(_.uniq($this.links));
                        $this.update();

                        return false;
                    }
                }
            });
        });

        this.sortFilterEntries = function(value) {
            var value = value ? value.toLowerCase().replace(/\s+/g, '') : '';

            $this.entries = _.sortBy($this.entries, function(o) { return o.name || o.title || o.id });

            if (!value) {
                $this.entriesFiltered = _.clone($this.entries);
                $this.entriesFiltered = _.filter($this.entries, function (o) {
                    return $this.links.indexOf(o._id) >= 0 ? false : true;
                });
            } else {
                $this.entriesFiltered = _.filter($this.entries, function (o) {
                    if ($this.links.indexOf(o._id) >= 0) {
                        return false;
                    }

                    var compare = o.name ? o.name : '';

                    compare += o.title ? o.title : '';
                    compare += o.slug ? o.slug : '';
                    compare = compare.toLowerCase().replace(/\s+/g, '');

                    return compare.indexOf(value) >= 0 ? true : false;
                });
            }
        }

        this.$updateValue = function(value) {

            if (!Array.isArray(value)) {
                value = [];
            }

            if (opts.hasOne && value.length > 1) {
                value = value.slice(0, 1);
            }

            if (this.links !== value) {
                this.links = value;
                this.update();
            }

        }.bind(this);

        this.focusedEntry = -1;
        this.focusedEntryReplaces = null;

        this.handleEnter = function(e) {
            var element = e.srcElement || e.target,
                value = element ? element.value.trim() : '',
                valueCompare,
                alreadyExists;

            if (!value) {
                return;
            }

            valueCompare = value.toLowerCase();

            alreadyExists = _.filter($this.entries, function (o) {
                return o.name  && o.name.toLowerCase().trim() === valueCompare
                    || o.title && o.title.toLowerCase().trim() === valueCompare
                    || o.slug  && o.slug.toLowerCase().trim() === valueCompare
                    || false;
            });

            if (alreadyExists.length > 0) {
                $this.links.push(alreadyExists[0]._id);
                $this.$setValue(_.uniq($this.links));

                $this.sortFilterEntries();

                if ($this.focusedEntry === -1) {
                    element.value = '';
                } else {
                    if ($this.focusedEntry >= $this.entriesFiltered.length) {
                        $this.focusedEntry = $this.entriesFiltered.length - 1;
                    }

                    element.value = $this.entriesFiltered[$this.focusedEntry].name
                        || $this.entriesFiltered[$this.focusedEntry].title
                        || $this.entriesFiltered[$this.focusedEntry].slug
                        || $this.focusedEntryReplaces
                        || '';
                }

                $this.update();

                return;
            }

            if (opts.createNew) {
                Cockpit.callmodule(
                    'collections',
                    'save',
                    [opts.createNew, { name: value, title: value}],
                    [opts.createNew, { name: value, title: value}]
                ).then(function (data) {
                    if (!data.result) {
                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        e.preventDefault();

                        App.ui.notify("Failed to create link. Try again later?", "danger");

                        return;
                    }

                    element.value = '';

                    $this.entries.push(data.result);

                    $this.sortFilterEntries();

                    $this.links.push(data.result._id);
                    $this.$setValue(_.uniq($this.links));

                    $this.focusedEntry = -1;
                    $this.focusedEntryReplaces = null;

                    $this.update();

                    return false;
                }).catch(function (data) {
                    App.ui.notify("Failed to create link. Try again later?", "danger");
                    $this.update();
                    return;
                });
            } else {
                App.ui.notify("Link does not exist.", "danger");
            }
        }.bind(this)

        this.handleScrollIntoView = function() {
            var element = $this.root.getElementsByClassName('uk-selected'),
                overflown = $this.root.getElementsByClassName('is-overflown'),
                top,
                scrollTop,
                dpheight,
                parent;

            if (!element.length || !overflown.length) {
                return;
            }

            element = element[0];
            overflown = overflown[0];

            elementRect = element.getBoundingClientRect();
            overflownRect = overflown.getBoundingClientRect();

            if (elementRect.bottom > overflownRect.bottom) {
                overflown.scrollTop = overflown.scrollTop + elementRect.bottom - overflownRect.bottom;

                return;
            }

            if (elementRect.top < overflownRect.top) {
                overflown.scrollTop = overflown.scrollTop + elementRect.top - overflownRect.top;

                return;
            }
        }.bind(this)

        this.handleUp = function(e) {
            var element = e.srcElement || e.target;

            $this.focusedEntry = $this.focusedEntry - 1;

            if ($this.focusedEntry < -1) {
                $this.focusedEntry = -1;
            }

            if ($this.focusedEntry === -1) {
                element.value = $this.focusedEntryReplaces;
            } else {
                element.value = $this.entriesFiltered[$this.focusedEntry].name
                    || $this.entriesFiltered[$this.focusedEntry].title
                    || $this.entriesFiltered[$this.focusedEntry].slug
                    || $this.focusedEntryReplaces;
            }

            $this.update();

            $this.handleScrollIntoView();
        }.bind(this)

        this.handleDown = function(e) {
            var element = e.srcElement || e.target;

            $this.focusedEntry = $this.focusedEntry + 1;

            if ($this.focusedEntry === 0) {
                $this.focusedEntryReplaces = element.value.trim();
            }

            if ($this.focusedEntry >= $this.entriesFiltered.length) {
                $this.focusedEntry = $this.entriesFiltered.length - 1;
            }

            element.value = $this.entriesFiltered[$this.focusedEntry].name
                || $this.entriesFiltered[$this.focusedEntry].title
                || $this.entriesFiltered[$this.focusedEntry].slug
                || $this.focusedEntryReplaces;

            $this.update();

            $this.handleScrollIntoView();
        }.bind(this)

        this.keyUp = function(e) {
            var dateNow = Date.now(),
                keyCode = e.keyCode || e.charCode || e.which || 0;

            lastKeyEventTimestamp = dateNow;
            clearTimeout(fixKeyUpDelay);

            if (dateNow - lastKeyEventTimestamp < 50)

            if (keyCode === 13)  {
                fixKeyUpDelay = setTimeout(function () { $this.handleEnter(e); }, e.type === 'keydown' ? 300 : 50);

                return false;
            }

            if (keyCode === 40) {
                fixKeyUpDelay = setTimeout(function () { $this.handleDown(e); }, e.type === 'keydown' ? 300 : 50);

                return false;
            }

            if (keyCode === 38) {
                fixKeyUpDelay = setTimeout(function () { $this.handleUp(e); }, e.type === 'keydown' ? 300 : 50);

                return false;
            }

            fixKeyUpDelay = setTimeout(function () {
                $this.fiterEntries(e);
            }, e.type === 'keydown' ? 300 : 10);

            return true;
        }.bind(this)

        this.fiterEntries = function(e) {
            var element = e.srcElement || e.target,
                keyCode = e.keyCode || e.charCode || e.which || 0,
                value = element ? element.value.trim() : '',
                valueCompare = value.toLowerCase(),
                alreadyExists;

            $this.logKey(e);

            if (value.toLowerCase().replace(/\s+/g, '').length === 0) {
                $this.entriesFiltered = _.clone($this.entries);
                $this.update();

                return true;
            }

            $this.sortFilterEntries(value);
            $this.update();

            return true;
        }.bind(this)

        this.logKey = function (e) {
            var element = e.srcElement || e.target,
                value = element ? element.value.trim() : '';

            return true;
        }

        this.remove = function (e) {
            this.removeIndex(e.item.idx);
            $this.filterinput.focus();

            $this.sortFilterEntries();
            $this.update();
        }

        this.toggle = function (e) {
            var index = this.links.indexOf(e.item.entry._id);

            if (e.item && e.item.entry && index >= 0) {
                this.removeIndex(index);
            } else {
                this.addId(e.item.entry._id);
            }

            $this.filterinput.focus();
            $this.sortFilterEntries();
            $this.update();
        }

        this.removeIndex = function (index) {
            if (index < 0) {
                return;
            }

            this.links.splice(index, 1);
            this.$setValue(this.links);
        }

        this.removeId = function (id) {
            if (!id) {
                return;
            }

            this.removeIndex(this.links.indexOf(id));
        }

        this.addId = function (id) {
            if (!id) {
                return;
            }

            this.links.push(id);
            this.$setValue(_.uniq(this.links));
        }

        this.resetfilterinput = function () {
            $this.filterinput.value = '';
            $this.filterinput.focus();

            $this.sortFilterEntries();
            $this.update();
        }

}, '{ }');
