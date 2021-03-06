const { Plugin } = require('powercord/entities');
const { camelCaseify, sleep } = require('powercord/util');
const { instance, getModuleByDisplayName } = require('powercord/webpack');

// Based on BBD normalizer
module.exports = class ClassNameNormalizer extends Plugin {
  constructor () {
    super();

    this.randClassReg = /^(?!pc-)((?:[a-z]|[0-9]|-)+)-(?:[a-z]|[0-9]|-|_){6}$/i;
    this.PROPERTY_BLACKLIST = [ 'displayName' ];
    this.ATTRIBUTE_BLACKLIST = [ 'px', 'ch', 'em', 'ms' ];
  }

  async startPlugin () {
    await sleep(2000); // bowserware:tm:
    this.patchModules(this._fetchAllModules());
    this.normalizeElement(document.querySelector('#app-mount'));

    // this is temporarily here ok, just making people think i'm doing stuff. Bowserware confirmed
    const GuildHeader = await getModuleByDisplayName('GuildHeader');
    require('powercord/injector').inject('pc-cnn-gh', GuildHeader.prototype, 'render', function (args, res) {
      res.props['data-guild-id'] = this.props.guild.id;
      return res;
    });

    if (window.__OVERLAY__) {
      document.body.classList.add('overlay');
    }
  }

  patchModules (modules) {
    for (const mod of modules) {
      this.patchModule(mod);
    }
  }

  patchModule (classNames) {
    for (const baseClassName in classNames) {
      // noinspection JSUnfilteredForInLoop
      const value = classNames[baseClassName];
      if (this._shouldIgnore(value)) {
        continue;
      }

      const classList = value.split(' ');
      for (const normalClass of classList) {
        const match = normalClass.match(this.randClassReg)[1];
        if (!match) {
          continue;
        } // Shouldn't ever happen since they passed the moduleFilter, but you never know

        const camelCase = camelCaseify(match);
        // noinspection JSUnfilteredForInLoop
        classNames[baseClassName] += ` pc-${camelCase}`;
      }
    }
  }

  normalizeElement (element) {
    if (!(element instanceof Element)) {
      return;
    }

    for (const targetClass of element.classList) {
      if (!this.randClassReg.test(targetClass)) {
        continue;
      }

      const match = targetClass.match(this.randClassReg)[1];
      const newClass = camelCaseify(match);
      element.classList.add(`pc-${newClass}`);
    }

    for (const child of element.children) {
      this.normalizeElement(child);
    }
  }

  // Module fetcher
  _fetchAllModules () {
    return Object.values(instance.cache)
      .filter(mdl => (
        mdl.exports &&
        Object.keys(mdl.exports)
          .filter(exp => !this.PROPERTY_BLACKLIST.includes(exp))
          .every(prop => typeof mdl.exports[prop] === 'string')
      ))
      .map(mdl => mdl.exports)
      .filter(mdl => {
        if (
          typeof mdl !== 'object' ||
          Array.isArray(mdl) ||
          mdl.__esModule ||
          Object.keys(mdl).length === 0
        ) {
          return false;
        }

        for (const baseClassName of Object.values(mdl)) {
          if (typeof baseClassName !== 'string') {
            return false;
          }

          if (this._shouldIgnore(baseClassName)) {
            continue;
          }

          if (
            !baseClassName.includes('-') ||
            !this.randClassReg.test(baseClassName.split(' ')[0])
          ) {
            return false;
          }
        }

        return true;
      });
  }

  _shouldIgnore (value) {
    return (
      !isNaN(value) ||
      this.ATTRIBUTE_BLACKLIST.some(prop => value.endsWith(prop)) || (
        value.startsWith('#') && (value.length === 7 || value.length === 4)
      ) ||
      value.includes('calc(') || value.includes('rgba')
    );
  }
};
