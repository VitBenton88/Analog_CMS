const Password = {
    /**
     * Helper function for generating randomly constructed string.
     *
     * @param {Boolean} `lower` boolean allows or disallows lower-case characters.
     * @param {Boolean} `upper` boolean allows or disallows upper-case characters.
     * @param {Boolean} `number` boolean allows or disallows number characters.
     * @param {Boolean} `symbol` boolean allows or disallows special characters.
     * @param {Number} `length` integer that sets the character length.
     * @return {String} Randomly constructed string.
     */
    
    generate: (lower = true, upper = true, number = true, symbol = true, length = 16) => {
        let generatedPassword = ''    
        const typesCount = lower + upper + number + symbol
        const typesArr = [{lower}, {upper}, {number}, {symbol}].filter(item => Object.values(item)[0])
        const randomFunc = {
            lower: getRandomLower,
            upper: getRandomUpper,
            number: getRandomNumber,
            symbol: getRandomSymbol
        }
        
        function getRandomLower() {
            return String.fromCharCode(Math.floor(Math.random() * 26) + 97)
        }
        
        function getRandomUpper() {
            return String.fromCharCode(Math.floor(Math.random() * 26) + 65)
        }
        
        function getRandomNumber() {
            return +String.fromCharCode(Math.floor(Math.random() * 10) + 48)
        }
        
        function getRandomSymbol() {
            const symbols = '!@#$%^&*(){}[]=<>/,.'
            return symbols[Math.floor(Math.random() * symbols.length)]
        }
        
        // create a loop
        for(let i = 0; i < length; i += typesCount) {
            typesArr.forEach(type => {
                const funcName = Object.keys(type)[0]
                generatedPassword += randomFunc[funcName]()
            });
        }
        
        const finalPassword = generatedPassword.slice(0, length)
        
        return finalPassword
    }
  }
  
  // Export the helper function object
  module.exports = Password