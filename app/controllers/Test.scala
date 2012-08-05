package controllers

import play.api.mvc._
import play.api.libs.json.Json

object Test extends Controller {
  def test1 = Action (Ok(views.html.fastSin()))
  def test2 = Action (Ok(views.html.sprite()))
  def test3 = Action (Ok(views.html.sprite_anim()))
  def test4 = Action (Ok(views.html.scroll()))
  def test5 = Action (Ok(views.html.map()))
}
