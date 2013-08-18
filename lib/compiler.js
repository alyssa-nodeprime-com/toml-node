function compile(nodes) {
  var data         = {};
  var currentPath  = null;
  var topLevelKeys = {};
  var subgroupKeys = {};

  return expand(nodes);

  // Collect array of nodes into `topLevelKeys` and `subgroupKeys` data
  function collect(nodes) {
    for(i in nodes) {
      var node = nodes[i];
      switch(node.type) {
        case 'Set':
          var value = node.value.value;
          if (node.value.type == 'Array') value = processArray(value);
          collectValue(node.line, node.column, node.key, value);
          break;
        case 'Group':
          collectGroup(node.line, node.column, node.value);
          break;
      }
    }
  };

  function collectValue(line, col, key, value) {
    var obj = currentPath ? subgroupKeys[currentPath] : topLevelKeys;
    var existing = obj[key];
    if (existing !== undefined) {
      var path = (currentPath ? currentPath + '.' + key : key);
      genError(line, col, "Cannot replace existing key " + path + ".");
    } else {
      obj[key] = value;
    }
  };

  function collectGroup(line, col, keygroup) {
    var existing = subgroupKeys[keygroup];
    checkPrefixPath(line, col, keygroup);
    if (existing !== undefined) {
      genError(line, col, "Cannot replace existing keygroup " + keygroup + ".");
    } else {
      subgroupKeys[keygroup] = {};
      currentPath = keygroup;
    }
  };

  function checkPrefixPath(line, col, keygroup) {
    var parts = keygroup.split('.');
    var lastPart = parts.pop();
    var prefix = parts.join('.');

    var existing = subgroupKeys[prefix];
    if (existing !== undefined) {
      var subValue = existing[lastPart];
      if (subValue !== undefined)
        genError(line, col, "Cannot replace existing key " + keygroup + " with keygroup.");
    }
  };

  // Expand collected values in `topLevelKeys` and `subgroupKeys` into `data`
  function expand(nodes) {
    collect(nodes);

    var keys = Object.keys(topLevelKeys);
    for (i in keys) {
      var key = keys[i];
      data[key] = topLevelKeys[key];
    }

    var keys = Object.keys(subgroupKeys);
    for (i in keys) {
      var key = keys[i];
      var obj = subgroupKeys[key];
      var subkeys = Object.keys(obj);
      for (j in subkeys) {
        var subkey = subkeys[j];
        deepValue(key)[subkey] = obj[subkey];
      };
    }

    return data;
  };

  function deepValue(path) {
    var obj = data;
    var parts = path.split('.');
    for(i in parts) {
      var part = parts[i];
      obj[part] = obj[part] || {};
      obj = obj[part];
    }
    return obj;
  }

  function processArray(array) {
    // Ensure that all items in the array are of the same type
    var firstType = null;
    for(i in array) {
      var node = array[i];
      if (firstType == null) {
        firstType = node.type;
      } else {
        if (node.type != firstType) {
          genError(node.line, node.column, "Expected type " + firstType + " but " + node.type + " found.");
        }
      }
    }

    // Recursively reduce array of nodes into array of the nodes' values
    return array.map(function(elem) {
      if (elem.type == 'Array') {
        return processArray(elem.value);
      } else {
        return elem.value;
      }
    });
  }

  function genError(line, col, err) {
    var ex = new Error(err);
    ex.line = line;
    ex.column = col;
    throw ex;
  }
};

module.exports = {
  compile: compile
};