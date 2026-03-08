class EventBusImpl extends EventTarget {
  on(eventName, listener) {
    this.addEventListener(eventName, (e) => listener(e.detail));
  }
  
  off(eventName, listener) {
    this.removeEventListener(eventName, listener);
  }

  emit(eventName, data) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}

const EventBus = new EventBusImpl();
export default EventBus;
