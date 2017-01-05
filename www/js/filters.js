angular.module("ionicStarterApp.filters", [])

.filter("characters", function() {
    return (input, chars, breakOnWord, ellipsis) => {
        if(isNaN(chars)) return input;
        if(chars <= 0) return '';
        if(input && input.length > chars) {
            input = input.substring(0, chars);

            if(!breakOnWord) {
                var lastspace = input.lastIndexOf(' ');
                // get last space
                if(lastspace !== -1) {
                    input = input.substr(0, lastspace);
                }
            } else {
                while(input.charAt(input.length-1) === ' ') {
                    input = input.substr(0, input.length-1);
                }
            }
            return input + ((ellipsis) ? '…' : '');
        }
        return input;
    };
})

.filter("shrinkNumber", ($filter) => {
    return (number, fractionSize) => {
        if(number === null) return null;
        if(number === 0) return "0";
        if(!fractionSize || fractionSize < 0)
            fractionSize = 1;
        var abs = Math.abs(number);
        var rounder = Math.pow(10,fractionSize);
        var isNegative = number < 0;
        var key = '';
        var powers = [
            {key: "Q", value: Math.pow(10,15)},
            {key: "T", value: Math.pow(10,12)},
            {key: "B", value: Math.pow(10,9)},
            {key: "M", value: Math.pow(10,6)},
            {key: "K", value: 1000}
        ];
        for(var i = 0; i < powers.length; i++) {
            var reduced = abs / powers[i].value;
            reduced = Math.round(reduced * rounder) / rounder;
            if(reduced >= 1) {
                abs = reduced;
                key = powers[i].key;
                break;
            }
        }
        return (isNegative ? '-' : '') + $filter("number")(abs, fractionSize) + key;
    };
});