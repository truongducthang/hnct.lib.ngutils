import {Component} from "@angular/core"

@Component({
	selector: "app",
	templateUrl: "./app.html"
})
export class AppCmp {

	dateString : string = "Initial"

	constructor() {
		setInterval(() => {
			this.formatDateString(new Date())
		}, 1000)
	}

	formatDateString(date : Date) {
		this.dateString = date.toTimeString()
	}

}