// dateHelpers.js
module.exports = {
    formatDateWithDayAndTime: function(date) {
        if (!date) return '';

        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            timeZoneName: 'short'
        };

        const formattedDate = new Date(date).toLocaleDateString(undefined, options);
        return formattedDate;
    }
};
