<field-link>

    <div>
        <div if="{!resultsLoaded}" class="uk-alert" if="{!fields.length}">
            { App.i18n.get('Loading field') }
        </div>

        <div if="{!opts.list && resultsLoaded && (!opts.hasOne || opts.hasOne && links.length < 1)}" name="autocomplete" class="uk-autocomplete uk-form-icon uk-form uk-width-1-1">
            <i class="uk-icon-link"></i>
            <input name="input" class="uk-width-1-1 uk-form-blank" autocomplete="off" type="text" placeholder="{ App.i18n.get(opts.placeholder || 'Add Link...') }">
        </div>

        <div if="{opts.list && resultsLoaded}" class="uk-form-icon uk-form uk-width-1-1">
            <i class="uk-icon-link"></i>
            <input onkeyup="{filterEntries}" name="input" class="uk-width-1-1 uk-form-blank" autocomplete="off" type="text" placeholder="{ App.i18n.get(opts.placeholder || 'Add Link...') }">
        </div>

        <div if="{resultsLoaded}" class="uk-margin uk-panel uk-panel-box" show="{ links && links.length }">
            <ul class="uk-list" each="{ link,idx in links }">
                <li><a onclick="{ parent.remove }"><i class="uk-icon-close"></i> { linkName(link, idx) }</a></li>
            </ul>
        </div>

        <div if="{opts.list && resultsLoaded}" class="list-entries {entriesFiltered.length > 6 ? 'is-overflown' : ''}">
            <ul if="{entriesFiltered.length > 0}" class="uk-list uk-list-line">
                <li each="{entry, idx in entriesFiltered}" if="{links.indexOf(entry._id) < 0}" onclick="{toggle}">
                    <i class="uk-icon-plus"></i>
                    <span>{entry.name || entry.title || entry.slug || entry._id}</span>
                </li>
            </ul>
            <span if="{entriesFiltered.length < 1}">No entries</span>
        </div>

    </div>

    <style scoped>
        .list-entries {
            max-height: 197px;
            overflow: auto;
            padding: 0 15px;
        }

        .is-overflown {
            box-shadow: inset 0 -10px 30px -20px rgba(0,0,0,0.25);
        }
    </style>

    <script>
        if (opts.__proto__ && opts.__proto__.list) {
            opts.list = opts.__proto__.list;
        }

        // Create an array of opts.collections
        if (!opts.collections) {
            opts.collections = [];
        } else if (typeof opts.collections === 'string') {
            opts.collections = opts.collections.replace(/\s+/g, '').split(',');
        } else if (Object.prototype.toString.call( opts.collections ) !== '[object Array]') {
            opts.collections = [];
        }

        var $this = this,
            // List of available collections
            collections = {},
            // Autocomplete defaults
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
            // Load collections && filter entries by opts.collections
            // Fullfill only after last request was made
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

                            // Check if opts.collections is valid
                            for (i = 0; i < l; i = i + 1) {

                                if (!collections.hasOwnProperty(opts.collections[i])) {
                                    // Collection does not exists, mark to remove it from opts.collections
                                    removeIndexes.unshift(i);
                                }
                            }

                            l = removeIndexes.length;

                            // Remove from opts.collections
                            for (i = 0; i < l; i = i + 1) {
                                opts.collections.splice(removeIndexes[i], 1);
                            }

                            $this.collectionsCount = Object.keys(collections).length;

                            // Special case: only one Collection available
                            // (Would ever happen? only when linking to parent of same collection type)
                            /**
                            if ($this.collectionsCount === 1 && opts.collections.length === 0) {
                                opts.collections = [Object.keys(collections)[0]];
                            }
                            /**/

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
            };

        this.links = [];
        this.resultsLoaded = false;
        this.collectionsCount = 0;

        // List of entries matching opts.collections
        this.entries = [];
        this.entriesFiltered = [];

        // Translate ID into readable name || title
        this.linkName = function (id, idx) {
            // Wait for next udpate() to finish loadEntries() XHRs
            if (!$this.resultsLoaded) {
                return id;
            }

            var i, l = $this.entries.length;

            for (i = 0; i < l; i = i + 1) {
                if ($this.entries[i]._id == id) {
                    return $this.entries[i].name || $this.entries[i].title || id;
                }
            }

            // It's an ID but previously did not match an entry
            if (id.match(/[0-9abdocef]{25}/)) {
                $this.links.splice(idx, 1);
                $this.$setValue($this.links);
            }

            return id;
        };

        this.on('mount', function () {
            loadEntries().then(function (data) {
                // Start autocomplete instance
                UIkit.autocomplete($this.autocomplete, _.defaults({source: data}, autocompleteDefaults));
                // Set loaded state
                $this.resultsLoaded = true;
                // Sort ascending
                $this.entries = _.sortBy($this.entries, function(o) { return o.name || o.title || o.id });
                $this.entriesFiltered = _.clone($this.entries);
                // Update link
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
                        // Not yet defined && not set single collection type
                        if (!value.match(/[0-9abdocef]{24,25}/)) {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            e.preventDefault();

                            if (!opts.createNew || opts.createNew && !collections.hasOwnProperty(opts.createNew)) {
                                App.ui.notify("Link does not exist.", "danger");

                                return;
                            }

                            // Try to create a new collection entry
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

                                // Add as a valid option
                                $this.entries.push(data.result);

                                // set value with new ID
                                value = data.result._id;

                                // Replace autocomplete instance
                                UIkit.autocomplete($this.autocomplete, _.defaults({source: $this.entries}, autocompleteDefaults));

                                $this.links.push(value);
                                $this.$setValue(_.uniq($this.links));
                                $this.update();

                                return;
                            }).catch(function (data) {
                                App.ui.notify("Failed to create link. Try again later?", "danger");

                                // Bring back the value
                                $this.input.value = value;
                                $this.update();

                                return;
                            });

                            // Remove the value
                            $this.input.value = '';
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

        toggle(e) {
            console.log(e.item.entry._id, $this.links);

            // Remove
            if (e.item && e.item.entry && $this.links.indexOf(e.item.entry._id) >= 0) {
                this.links.splice($this.links.indexOf(e.item.entry._id), 1);
                this.$setValue(this.links);
            } else {
                $this.links.push(e.item.entry._id);
                $this.$setValue(_.uniq($this.links));
            }
        }

        filterEntries(e) {
            var element = e.srcElement || e.target,
                value = element ? element.value.trim() : null;

            if (e.keyCode === 13) {
                if (opts.createNew) {
                    console.log('Create', value);

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

                        // Remove value from input
                        element.value = '';

                        // Add as a valid option
                        $this.entries.push(data.result);
                        // Sort ascending
                        $this.entries = _.sortBy($this.entries, function(o) { return o.name || o.title || o.id });
                        $this.entriesFiltered = _.clone($this.entries);

                        // set value with new ID
                        $this.links.push(data.result._id);
                        $this.$setValue(_.uniq($this.links));
                        $this.update();

                        return;
                    }).catch(function (data) {
                        App.ui.notify("Failed to create link. Try again later?", "danger");
                        $this.update();
                        return;
                    });
                } else {
                    App.ui.notify("Link does not exist.", "danger");
                }

                return;
            }

            value = value.toLowerCase().replace(/\s+/g, '')

            if (!value) {
                $this.entriesFiltered = _.clone($this.entries);

                return;
            }

            $this.entriesFiltered = _.filter($this.entries, function (o) {
                var compare = o.name ? o.name : '';

                compare += o.title ? o.title : '';
                compare += o.slug ? o.slug : '';
                compare = compare.toLowerCase().replace(/\s+/g, '');

                return compare.indexOf(value) >= 0 ? true : false;
            });

            $this.update();
        };

        remove(e) {
            this.links.splice(e.item.idx, 1);
            this.$setValue(this.links);
        }

    </script>

</field-link>
