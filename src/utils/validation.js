const validator = require('validator');

class ValidationService {
  validateEmail(email) {
    if (!email) throw new Error('Email is required');
    if (!validator.isEmail(email)) throw new Error('Invalid email format');
  }

  validatePassword(password) {
    if (!password) throw new Error('Password is required');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    
    // Optional: Add more complex password validation
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(password)) {
      throw new Error('Password must include uppercase, lowercase, and number');
    }
  }

  validateRegistration(data) {
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    if (!data.name) throw new Error('Name is required');
  }

  validateServiceProviderRegistration(data) {
    const { businessName, ownerName, email, phone, password, serviceType } = data;
    
    if (!businessName || businessName.trim() === '') {
      throw new Error('Business name is required');
    }
    
    if (!ownerName || ownerName.trim() === '') {
      throw new Error('Owner name is required');
    }
    
    this.validateEmail(email);
    
    if (!phone || phone.trim() === '') {
      throw new Error('Phone number is required');
    }
    
   
    
    this.validatePassword(password);
    
    if (!serviceType || serviceType.trim() === '') {
      throw new Error('Service type is required');
    }
    
  }
  
  validateServiceAreas(serviceAreas) {
    if (!Array.isArray(serviceAreas)) {
      throw new Error('Service areas must be an array');
    }
    
    if (serviceAreas.length === 0) {
      throw new Error('At least one service area is required');
    }
    
    for (const area of serviceAreas) {
      if (typeof area !== 'string' || area.trim() === '') {
        throw new Error('Service areas must be non-empty strings');
      }
    }
  }
  
  validateAvailability(availability) {
    if (typeof availability !== 'object' || availability === null) {
      throw new Error('Availability must be an object');
    }
    
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day in availability) {
      if (!daysOfWeek.includes(day.toLowerCase())) {
        throw new Error(`Invalid day: ${day}`);
      }
      
      const dayData = availability[day];
      
      if (typeof dayData !== 'object' || dayData === null) {
        throw new Error(`Availability for ${day} must be an object`);
      }
      
      if (typeof dayData.isAvailable !== 'boolean') {
        throw new Error(`isAvailable for ${day} must be a boolean`);
      }
      
      // Validate slots if the day is available
      if (dayData.isAvailable && dayData.slots) {
        if (!Array.isArray(dayData.slots)) {
          throw new Error(`Slots for ${day} must be an array`);
        }
        
        for (const slot of dayData.slots) {
          if (!slot.start || !slot.end) {
            throw new Error(`Each slot must have start and end times`);
          }
          
          // Validate time format (HH:MM)
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
            throw new Error(`Invalid time format. Use HH:MM format`);
          }
          
          // Validate start time is before end time
          const [startHour, startMinute] = slot.start.split(':').map(Number);
          const [endHour, endMinute] = slot.end.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          if (startMinutes >= endMinutes) {
            throw new Error(`Start time must be before end time for slot in ${day}`);
          }
        }
      }
    }
  }
}

module.exports = new ValidationService();