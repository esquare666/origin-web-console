"use strict";
/* jshint unused: false */

/**
 * @ngdoc function
 * @name openshiftConsole.controller:NextStepsController
 * @description
 * # NextStepsController
 * Controller of the openshiftConsole
 */
angular.module("openshiftConsole")
  .controller("NextStepsController", function($scope, $http, $routeParams, DataService, $q, $location, ProcessedTemplateService, TaskList, $parse, Navigate, Logger, $filter, imageObjectRefFilter, failureObjectNameFilter, ProjectsService) {
    var displayNameFilter = $filter('displayName');
    var watches = [];

    $scope.emptyMessage = "Loading...";
    $scope.alerts = [];
    $scope.loginBaseUrl = DataService.openshiftAPIBaseUrl();
    $scope.buildConfigs = {};
    $scope.showParamsTable = false;

    $scope.projectName = $routeParams.project;
    var imageName = $routeParams.imageStream;
    var imageTag = $routeParams.imageTag;
    var namespace = $routeParams.namespace;
    $scope.fromSampleRepo = $routeParams.fromSample;

    var template = $routeParams.template;
    var nameLink = "";
    var name = "";
    if (creatingFromImage()) {
      nameLink = "project/" + $scope.projectName + "/create/fromimage?imageName=" + imageName + "&imageTag=" + imageTag + "&namespace=" + namespace + "&name=" + name;
      name = imageName + ":" + imageTag;
    } else if (creatingFromTemplate()) {
      nameLink = "project/" + $scope.projectName + "/create/fromtemplate?template=" + template + "&namespace=" + namespace;
      name = template;
    }

    $scope.breadcrumbs = [
      {
        title: $scope.projectName,
        link: "project/" + $scope.projectName
      },
      {
        title: "Add to Project",
        link: "project/" + $scope.projectName + "/create"
      },
      {
        title: name,
        link: nameLink
      },
      {
        title: "Next Steps"
      }
    ];

    var processedTemplateData = ProcessedTemplateService.getTemplateData();
    $scope.parameters = processedTemplateData.params;
    _.each($scope.parameters, function(env) {
      $filter('altTextForValueFrom')(env);
    });
    $scope.templateMessage = processedTemplateData.message;
    ProcessedTemplateService.clearTemplateData();

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        // Update project breadcrumb with display name.
        $scope.breadcrumbs[0].title = $filter('displayName')(project);
        if (!name) {
          Navigate.toProjectOverview($scope.projectName);
          return;
        }
        watches.push(DataService.watch("buildconfigs", context, function(buildconfigs) {
          $scope.buildConfigs = buildconfigs.by("metadata.name");
          $scope.createdBuildConfig = $scope.buildConfigs[name];
          Logger.log("buildconfigs (subscribe)", $scope.buildConfigs);
        }));

        $scope.createdBuildConfigWithGitHubTrigger = function() {
          return _.some(_.get($scope, 'createdBuildConfig.spec.triggers'), {type: 'GitHub'});
        };

        $scope.createdBuildConfigWithConfigChangeTrigger = function() {
          return _.some(_.get($scope, 'createdBuildConfig.spec.triggers'), {type: 'ConfigChange'});
        };

        $scope.allTasksSuccessful = function(tasks) {
          return !pendingTasks(tasks).length && !erroredTasks(tasks).length;
        };

        $scope.toggleParamsTable = function() {
          $scope.showParamsTable = true;
        };

        function erroredTasks(tasks) {
          var erroredTasks = [];
          angular.forEach(tasks, function(task) {
            if (task.hasErrors) {
              erroredTasks.push(task);
            }
          });
          return erroredTasks;
        }
        $scope.erroredTasks = erroredTasks;

        function pendingTasks(tasks) {
          var pendingTasks = [];
          angular.forEach(tasks, function(task) {
            if (task.status !== "completed") {
              pendingTasks.push(task);
            }
          });
          return pendingTasks;
        }
        $scope.pendingTasks = pendingTasks;

        $scope.$on('$destroy', function(){
          DataService.unwatchAll(watches);
        });

      }));

      function creatingFromTemplate() {
        return template && namespace;
      }

      function creatingFromImage() {
        return imageName && imageTag && namespace;
      }
  });
