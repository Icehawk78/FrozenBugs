var scope = angular.element('body').scope();
var game = scope.game;
var units = game.units();
var buyMeat = true;
var buyTerr = true;
var buyEnergy = true;
var autobuy = 0;
var fasterUpgrades = [];

var autoSpeed = 10000;
var mothN4 = 2013;
var mothEnd = 5546;
var batCount = 393;

game.unitlist().forEach(function(u) {
  var upgrade = u.upgrades.byName[u.name + 'prod'];
  if (upgrade != null) {
    fasterUpgrades.push(upgrade);
  }
});

var empowerList = units.territory._parents().map(function(u) {return game.upgrade(u.name + 'empower')});

function unitRatio(u) {
  if (u._producerPath.getCoefficients().length > 1) {
    return u._producerPath.getCoefficientsNow()[1].dividedBy(u.maxCostMetOfVelocity().times(u.twinMult())).toNumber();
  } else {
    return 0;
  }
}

function currentMeat(unit) {
  if (!unit) {
    return currentMeat(units.drone);
  }
  if (unitRatio(unit) > 2) {
    return currentMeat(unit.next);
  } else {
    return unit;
  }
}

function buyMeatTwin(unit, amount) {
  var twin = game.upgrade(unit.name + 'twin');
  var realAmount = amount == 0 ? unit.maxCostMet(1).times(unit.twinMult()) : amount;
  if (twin && unit.next) {
    var parentCost = twin.totalCost()[0].val;
    var parent = twin.totalCost()[0].unit;
    var unitCost = parent.costByName[unit.name].val.dividedBy(parent.twinMult());
    var totalUnitCost = unitCost.times(parentCost);

    if (totalUnitCost.times(1.5).lessThan(realAmount)) {
      if (!twin.isBuyable()) {
        if (unit.count().lessThan(totalUnitCost)) {
          console.log('Twinning-Bought', totalUnitCost.minus(unit.count()).toExponential(2), unit.unittype.slug);
          unit.buy(unitCost.times(parentCost).minus(unit.count()));
        }
        console.log('Twinning-Bought', parentCost.toExponential(2), parent.unittype.slug);
        buyMeatTwin(parent, parentCost);
      }
      if (twin.isBuyable()) {
        twin.buy(1);
        console.log('Bought Twin', unit.unittype.slug);
        buyMeatTwin(unit, amount);
      }
    } else {
      console.log('Bought', realAmount.toExponential(2), unit.unittype.slug);
      unit.buy(realAmount);
    }
  } else {
    console.log('Bought', realAmount.toExponential(2), unit.unittype.slug);
    unit.buy(realAmount);
  }
}

function manualTierUp() {
  if (currentMeat().next) {
    buyMeatTwin(currentMeat().next, 0);
  }
}

function currentTerritory() {
  var current = units.swarmling;
  var currentProd = 0;
  units.territory._parents().forEach(function(u) {
    var uProd = u.maxCostMet(1).times(u.twinMult()).times(u.eachProduction().territory);
    if (uProd.greaterThan(currentProd)) {
      currentProd = uProd;
      current = u;
    }
  });
  return current;
}

function unitCostAsPercentOfVelocity (unit, cost) {
  var MAX = new Decimal(9999.99);
  var count = cost.unit.velocity();
  if (count.lessThanOrEqualTo(0)) {
    return MAX;
  }
  return Decimal.min(MAX, cost.val.times(unit.maxCostMetOfVelocity()).dividedBy(count));
}

// var buyList = [game.upgrade('expansion')].concat(units.nexus.upgrades.list);
var buyListProto = _.flatten([units.larva.upgrades.list, units.nexus.upgrades.list, units.meat.upgrades.list, units.territory._parents().map(function(p){return game.upgrade(p.name + 'twin')})]);
var buyList = buyListProto.slice(0);

var buyFunc = function() {
  if (buyEnergy) {
    autoEnergy();
  }
  
  buyList.forEach(function(u) {
    if (u.isBuyable()) {
      console.log('Bought', u.maxCostMet(1).toNumber(), u.name);
      u.buyMax(1);
    }
  });
  fasterUpgrades.forEach(function(u) {
    if (u.isBuyable() && u.totalCost()[0].val.times(2).lessThan(u.totalCost()[0].unit.count())) {
      console.log('Bought Faster', u.unit.unittype.slug, u.maxCostMet(1).toNumber(), 'times');
      u.buyMax(1);
    }
  });
  
  var currTerr = currentTerritory();
  
  empowerList.forEach(function(u) {
    if (u.isBuyable() && currTerr.eachCost()[0].val.greaterThan(u.unit.eachCost()[0].val) && u.unit.totalProduction().territory.times(1000).lessThan(units.territory.velocity())) {
      console.log('Bought Empower', u.unit.unittype.slug);
      u.buy(1);
    }
  });
  
  currTerr = currentTerritory();
  
  if (buyTerr && currTerr.isBuyable()) {
    setTimeout(function() {
	  console.log('Bought', currTerr.maxCostMet(1).times(currTerr.twinMult()).toExponential(2), currTerr.unittype.slug);
	  currTerr.buyMax(1);
	}, 1000);
  }
  
  var currMeat = currentMeat();
  var meatList = unitRatio(currMeat) > 0.01 ? [currMeat.next, currMeat] : [currMeat];
  
  meatList.forEach(function(m) {
    if (buyMeat && m.isBuyable()) {
      setTimeout(function() {
        buyMeatTwin(m, 0);
      }, 2000)
    }
  });
  autobuy = setTimeout(buyFunc, autoSpeed);
};

var autoEnergy = function() {
  buyList = buyListProto.slice(0);
  if (units.moth.count().toNumber() >= mothN4) {
    if (game.upgrade('nexus5').count().toNumber() == 0) {
      buyList = buyList.concat(game.upgrade('nexus5'));
    } else if (units.moth.count().toNumber() < mothEnd) {
      buyList = buyList.concat(units.moth);
    } else if (units.bat.count().toNumber() < batCount) {
      buyList = buyList.concat(units.bat);
    } else if (game.ascendCost().gt(units.energy._getCap())) {
      buyList.unshift(game.upgrade('swarmwarp'));
    } else {
      // Add ascension?
      return 0;
    }
  } else {
    buyList = buyList.concat(units.moth);
  }
};
