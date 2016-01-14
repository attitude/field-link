riot.tag2('field-link', '<div> <div if="{resultsLoaded && (!opts.hasOne || opts.hasOne && links.length < 1)}" name="autocomplete" class="uk-autocomplete uk-form-icon uk-form uk-width-1-1"> <i class="uk-icon-link"></i> <input name="input" class="uk-width-1-1 uk-form-blank" autocomplete="off" type="text" placeholder="{App.i18n.get(opts.placeholder || \'Add Link...\')}"> </div> <div if="{resultsLoaded}" class="uk-margin uk-panel uk-panel-box" show="{links && links.length}"> <div class="uk-margin-small-right uk-margin-small-top" each="{link,idx in links}"> <a onclick="{parent.remove}"><i class="uk-icon-close"></i></a> {linkName(link, idx)} </div> </div> <div if="{!resultsLoaded}" class="uk-alert" if="{!fields.length}"> {App.i18n.get(\'Loading field\')} </div> </div>', '', '', function(opts) {

        if (!opts.collections) {
            opts.collections = [];
        } else if (typeof opts.collections === 'string') {
            opts.collections = opts.collections.replace(/\s+/g, '').split(',');
        } else if (Object.prototype.toString.call( opts.collections ) !== '[object Array]') {
            opts.collections = [];
        }

        var $this = this,

            collections = {},

            entries = [],

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
                                            fulfill(entries);
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

                                            entries = entries.concat(data.result);
                                        }

                                        if ($this.collectionsCount === collectionsResolved) {
                                            fulfill(entries);
                                        }
                                    }).catch(function() {
                                        collectionsResolved = collectionsResolved + 1;

                                        if ($this.collectionsCount === collectionsResolved) {
                                            fulfill(entries);
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

        this.linkName = function (id, idx) {

            if (!$this.resultsLoaded) {
                return id;
            }

            var i, l = entries.length;

            for (i = 0; i < l; i = i + 1) {
                if (entries[i]._id == id) {
                    return entries[i].name || entries[i].title || id;
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

                $this.update();
            });

            App.$(this.root).on({

                'selectitem.uk.autocomplete keydown': function(e, data) {
                    var value = e.type=='keydown' ? $this.input.value : data.value;

                    if (e.type=='keydown' && e.keyCode != 13) {
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

                                entries.push(data.result);

                                value = data.result._id;

                                UIkit.autocomplete($this.autocomplete, _.defaults({source: entries}, autocompleteDefaults));

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

                            $this.input.value = "";
                            $this.update();

                            return;
                        }

                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        e.preventDefault();
                        $this.links.push(value);
                        $this.input.value = "";
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

        this.remove = function(e) {
            this.links.splice(e.item.idx, 1);
            this.$setValue(this.links);
        }.bind(this)

}, '{ }');
