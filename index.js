const discountRequirements = document.querySelector(".ticker-form>form");
let balanceSheet;
let cashflowSheet;
let scaleFactor = 0;
let dollarUnits = '';

const plugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || '#353941';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

discountRequirements.addEventListener('submit', async (event) =>{
  event.preventDefault();
  let discountParameters = new FormData(discountRequirements);
  let stockTicker = discountParameters.get('ticker-selection');
  let growthRate = checkNumber(Number(discountParameters.get('growth-rate')));
  let terminalPrice = checkNumber(Number(discountParameters.get('terminal-price')));
  let desiredReturn = checkNumber(Number(discountParameters.get('desired-return')));
  let yearNumber = checkNumber(Number(discountParameters.get('year-number')));



    try {
    const cashflowResponse = await fetch(`https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${stockTicker}&apikey=I4LVF6V13UIF3LOM`);
    cashflowSheet = await cashflowResponse.json();
    const balanceSheetResponse = await fetch(`https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${stockTicker}&apikey=I4LVF6V13UIF3LOM`);
    balanceSheet = await balanceSheetResponse.json()
    if(((cashflowSheet?.annualReports[0]?.operatingCashflow)/(10**9)) < 1){
      scaleFactor = 10**6;
      dollarUnits = 'Millions'
    } else {
      scaleFactor = 10**9;
      dollarUnits = 'Billions';
    };  
    let yearArray = createStockYearArray(cashflowSheet);
    let cashflowArray = createStockCashflowArray(cashflowSheet);
  
    //displays cashflow graph
    let cashflowGraph = document.getElementById('cashflow');
    new Chart(cashflowGraph, {
    type: 'line',
    data: {
      labels: yearArray.reverse(),
      datasets: [{
        label: ('Free Cash Flow in ' + dollarUnits),
        data: cashflowArray.reverse(),
        borderWidth: 1,
        tension: 0.3,
        backgroundColor: '#90b8f8',
        borderColor: '#90b8f8',
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `$ ${value}`
          }
        }
      },
      plugins: {
        cumstomCanvasBackgroundColor:{
          color: '#353941',
        }
      }
    },
    plugins: [plugin],  
  });
  
    //produces percent change graph
    let percentChangeGraph = document.getElementById('percent-change');
    new Chart(percentChangeGraph, {
      type: 'line',
      data: {
        labels: yearArray.slice(1),
        datasets: [{
          label: 'Change in Cashflow %',
          data: calculatePercentChange(cashflowArray),
          borderWidth: 1,
          tension: 0.3,
          borderColor: '#90b8f8',
          backgroundColor: '#90b8f8',
        }]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Year'
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `${value}%`
            },
            title: {
              display: true,
              text: 'Percent Change'
            },
          }
        },
        plugins: {
          cumstomCanvasBackgroundColor:{
            color: '#353941',
          }
        }
      },
      plugins: [plugin],
    });
  
    //Creates intrinsic value graph
    let marginPercents = ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];
    let currentCashOnHand = (balanceSheet?.annualReports[0]?.cashAndShortTermInvestments)/scaleFactor;
    let currentYearFreeCaashFlow = (cashflowSheet.annualReports[0].operatingCashflow - cashflowSheet.annualReports[0].capitalExpenditures)/scaleFactor;
    let stockValue = calculateIntrinsicValue(yearNumber, currentYearFreeCaashFlow, growthRate, desiredReturn, terminalPrice, currentCashOnHand);
    let marginValues = calculateMargins(stockValue);
    let valuationGraph = document.getElementById('valuation-graph');
    new Chart(valuationGraph, {
      type: 'line',
      data: {
        labels: marginPercents,
        datasets: [{
          label: ('Company Valuation in ' + dollarUnits),
          data: marginValues,
          borderWidth: 1,
          tension: 0.3,
          borderColor: '#90b8f8',
          backgroundColor: '#90b8f8',
        }]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Margin of Safety %'
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `$ ${value}`
            },
            title: {
              display: true,
              text: 'Purchase Price'
            },
          }
        },
        plugins: {
          cumstomCanvasBackgroundColor:{
            color: '#353941',
          }
        }
      },
      plugins: [plugin],
    });

    Chart.defaults.color= "#d9dbde"
  
    //displays percent cashflow & margin of safety statistics
    let annualPercentChange = calculatePercentChange(cashflowArray);
  
    let percentChangeAverageElement = document.querySelector('.cashflow-average');
    let averagePercentCashflow = calculateAverage(annualPercentChange);
    percentChangeAverageElement.innerText = 'Average Percent Change: ' + averagePercentCashflow + '%';
  
    let percentChangeMinElement = document.querySelector('.min-change');
    let minPercentCashflow = Math.round(Math.min(...annualPercentChange)*100)/100;
    percentChangeMinElement.innerText = 'Minimum Percent Change: ' + minPercentCashflow + '%';
  
    let percentChangeMaxElement = document.querySelector('.max-change');
    let maxPercentCashflow = Math.round(Math.max(...annualPercentChange)*100)/100;
    percentChangeMaxElement.innerText = 'Maximum Percent Change: ' + maxPercentCashflow + '%';
  
    let twentyMarginElement = document.querySelector('.twenty-margin');
    let twentyMarginValue = Math.round((stockValue*0.8)*100)/100;
    twentyMarginElement.innerText = '20% Margin:   $ ' + twentyMarginValue;
  
    let thirtyMarginElement = document.querySelector('.thirty-margin');
    let thirtyMarginValue = Math.round((stockValue*0.7)*100)/100;
    thirtyMarginElement.innerText = '30% Margin:   $ ' + thirtyMarginValue;
  
    let fortyMarginElement = document.querySelector('.forty-margin');
    let fortyMarginValue = Math.round((stockValue*0.6)*100)/100;
    fortyMarginElement.innerText = '40% Margin: $ ' + fortyMarginValue;
  
    let marginTitleElement = document.getElementById('margin-title');
    marginTitleElement.innerText = 'Margin of Safety and Buy Price in ' + dollarUnits;  

    document.querySelector('.search-section').classList.add('hidden');
    document.querySelector('.display-section').classList.remove('hidden');
  } catch {
    document.querySelector('.ticker-form>p').innerText = 'Invalid Stock Ticker; Refresh Page and Try Again'
  }
})

const helpButton = document.querySelector('.search-section button')
helpButton.addEventListener('click', (event)=>{
  document.querySelector('.explanation').classList.remove('hidden');
  helpButton.classList.add('hidden');
});

document.querySelector('.restart-button').addEventListener('click', (event)=>{
  location.reload();
})


//FUNCTION LIST

function createStockYearArray(stockData){
  let yearArray =[];
  if(!stockData) return yearArray
  stockData.annualReports.forEach((element) => {  
  yearArray.push(element.fiscalDateEnding.slice(0,4));
  })
  return yearArray
};

function createStockCashflowArray(stockData){
  let cashflowArray = []
  if(!stockData) return cashflowArray;
  stockData.annualReports.forEach((element) => {
    //produces the free cash flow of the company in millions
    let freeCashFlow = (element.operatingCashflow - element.capitalExpenditures)/(scaleFactor);
    cashflowArray.push(freeCashFlow);
    })
  return cashflowArray
};

//determines the intrinsic value of a company based on discounted future cashflows
function calculateIntrinsicValue(years, initialFCF, growthFactor, returnDemanded, terminalPriceMultiple, companyCashOnHand){
  let intrinsicValue = 0;
  let currentCashValue = initialFCF;
  let growthForYear = 0;
  let presentValue = 0;
  let sellPrice = 0;
  let terminalValue = 0;
  let percentGrowth = (growthFactor / 100) + 1;
  let percentReturn = (returnDemanded / 100) + 1;

  for(let step = 1; step < (years + 1); step++){
    growthForYear = currentCashValue*percentGrowth;
    presentValue = growthForYear/(percentReturn**step);
    intrinsicValue = intrinsicValue + presentValue;
    currentCashValue = growthForYear;
  }

  sellPrice = currentCashValue*terminalPriceMultiple;
  terminalValue = sellPrice/(percentReturn**years);
  intrinsicValue = intrinsicValue + terminalValue + companyCashOnHand;

  return intrinsicValue;  
};

//determines buy price for company based on discounts with increments of 10%
function calculateMargins(intrinsicValue){
  let marginValues = []
  let discountValue = 0;
  let marginPercent = 1;

  for(step = 0; step < 11; step++){
    discountValue = Math.round((intrinsicValue*marginPercent)*100)/100;
    marginValues.push(discountValue);
    marginPercent = marginPercent - 0.1;
  }

  return marginValues;
};

//calculates the average of an array of numbers
function calculateAverage(arrayOfNumbers){
  let sum = 0;
  let average = 0;

  arrayOfNumbers.forEach((element) => {
    sum = sum + element;
  })
  average = sum/arrayOfNumbers.length;
  average = Math.round(average*100)/100

  return average
};

/*calculates the change between each index and returns an array of percent values
NOTE: Array values must be in correct order if you are calculating percent change from year to year*/
function calculatePercentChange(arrayofNumbers){
  let percentChangeArray = [];
  let percentChange = 0;

  for(step = 1; step < arrayofNumbers.length; step++){
    percentChange = (arrayofNumbers[step] - arrayofNumbers[step-1])/arrayofNumbers[step-1]*100;
    percentChangeArray.push(percentChange);
  }

  return percentChangeArray;
}

function checkNumber(input){
  if(isNaN(input)){
    return 0
  }else{
    return input
  }
}