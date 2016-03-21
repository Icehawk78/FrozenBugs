var scope = angular.element('body').scope();
var game = scope.game;
var units = game.units();
var buyMeat = true;
var buyTerr = true;
var autobuy = 0;
var fasterUpgrades = [];

game.unitlist().forEach(function(u) {
  var upgrade = u.upgrades.byName[u.name + 'prod'];
  if (upgrade != null) {
    fasterUpgrades.push(upgrade);
  }
});

function unitRatio(u) {
  if (u._producerPath.getCoefficients().length > 1) {
    return u._producerPath.getCoefficientsNow()[1].dividedBy(u.maxCostMetOfVelocity().times(u.twinMult())).toNumber();
  } else {
    return 0;
  }
}

function currentMeat(unit) {
  if (unitRatio(unit) > 2) {
    return currentMeat(unit.next);
  } else {
    return unit;
  }
}

function currentTerritory() {
  return _.max(units.territory._parents(), function(u) {return u.maxCostMet(1).times(u.twinMult()).times(u.eachProduction().territory).toNumber()});
}

function unitCostAsPercentOfVelocity (unit, cost) {
  var MAX = new Decimal(9999.99);
  var count = cost.unit.velocity();
  if (count.lessThanOrEqualTo(0)) {
    return MAX;
  }
  return Decimal.min(MAX, cost.val.times(unit.maxCostMetOfVelocity()).dividedBy(count));
}

var buyList = units.larva.upgrades.list.concat(units.nexus.upgrades.list);
// var buyList = [game.upgrade('expansion')].concat(units.nexus.upgrades.list);

var buyFunc = function() {
  var currMeat = currentMeat(units.drone);
  var meatList = unitRatio(currMeat) > 0.01 ? [currMeat.next, currMeat] : [currMeat];
  var currTerr = currentTerritory();
  
  buyList.forEach(function(u) {
    if (u.isBuyable()) {
      u.buyMax(1);
    }
  });
  fasterUpgrades.forEach(function(u) {
    if (u.isBuyable && u.totalCost()[0].val.times(2).lessThan(u.totalCost()[0].unit.count())) {
	  u.buyMax(1);
	}
  });
  
  if (buyTerr && currTerr.isBuyable()) {
    setTimeout(function() {
	  console.log('Bought', currTerr.maxCostMet(1).times(currTerr.twinMult()).toExponential(2), currTerr.unittype.slug);
	  currTerr.buyMax(1);
	}, 1000);
  }
  
  meatList.forEach(function(m) {
    if (buyMeat && m.isBuyable()) {
	  setTimeout(function() {
	    console.log('Bought', m.maxCostMet(1).times(m.twinMult()).toExponential(2), m.unittype.slug);
		m.buyMax(1);
	  }, 2000)
	}
  });
  autobuy = setTimeout(buyFunc, 10000);
};
