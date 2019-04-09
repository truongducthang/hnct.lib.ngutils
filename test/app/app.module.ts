import {NgModule} from "@angular/core"
import { AppCmp } from "./app.cmp"
import {BrowserModule} from "@angular/platform-browser"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule } from "@angular/forms"
import {FormUtilModule} from "../../src/ts/index"
import { DemoForm } from "./demo-form.cmp";
import { AppRouting } from "./app.routes";

@NgModule({
	imports:[
		BrowserModule, 
		CommonModule,
		ReactiveFormsModule,
		FormUtilModule,
		AppRouting
	],
	exports:[DemoForm],
	declarations:[AppCmp, DemoForm],
	bootstrap: [AppCmp]
})
export class AppModule {

}